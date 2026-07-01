/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * ClaudeSessionStore
 *
 * Ingests Claude Code hook events (already parsed from the socket) and folds
 * them into one SessionState per `session_id`. Pure JS + EventEmitter, with no
 * Electron dependency, so it can be unit/smoke-tested in plain Node.
 *
 * Model (mirrors the canvas design brief):
 *   - A session is a linear sequence of *turns*. A turn starts on
 *     UserPromptSubmit and ends on Stop/StopFailure.
 *   - Within a turn, tool calls fan out. PreToolUse opens a tool call,
 *     PostToolUse closes it. They are paired by `tool_use_id` when Claude Code
 *     provides one, else by FIFO match on `tool_name` within the turn.
 *   - Per-turn tool calls retain startedAt / finishedAt / durationMs so a
 *     faithful timeline (and time-gap encoding) can be drawn later, rather than
 *     relying on a capped recent[] ring buffer.
 *
 * Emits 'change' (with the changed session_id) after every ingested event.
 */

const { EventEmitter } = require('events');

const RECENT_CAP = 200; // ring-buffer size for the human-readable activity log

/** Heuristic: did a PostToolUse payload describe a failure? */
function isFailure(toolResponse) {
  if (!toolResponse || typeof toolResponse !== 'object') return false;
  return Boolean(toolResponse.error || toolResponse.is_error || toolResponse.success === false);
}

/**
 * Render any value as complete, readable, indented lines — nothing dropped.
 * Multi-line strings (e.g. bash stdout) print verbatim instead of JSON-escaped,
 * and nested objects/arrays are expanded recursively (depth-capped for safety).
 */
function formatLines(v, indent = '', depth = 0) {
  const out = [];
  if (v === null || v === undefined) {
    out.push(indent + String(v));
  } else if (typeof v === 'string') {
    for (const line of v.split('\n')) out.push(indent + line);
  } else if (typeof v !== 'object') {
    out.push(indent + String(v));
  } else if (depth > 8) {
    out.push(indent + JSON.stringify(v));
  } else if (Array.isArray(v)) {
    v.forEach((item, i) => {
      if (item && typeof item === 'object') {
        out.push(`${indent}[${i}]`);
        out.push(...formatLines(item, indent + '  ', depth + 1));
      } else {
        out.push(...formatLines(item, indent, depth + 1));
      }
    });
  } else {
    for (const [k, val] of Object.entries(v)) {
      if (val && typeof val === 'object') {
        out.push(`${indent}${k}:`);
        out.push(...formatLines(val, indent + '  ', depth + 1));
      } else if (typeof val === 'string' && val.includes('\n')) {
        out.push(`${indent}${k}:`);
        out.push(...formatLines(val, indent + '  ', depth + 1));
      } else {
        out.push(`${indent}${k}: ${val}`);
      }
    }
  }
  return out;
}

/** Full, readable text for a tool_response — every field, nothing curated away. */
function toolOutputText(tr) {
  if (tr == null) return '';
  if (typeof tr === 'string') return tr;
  return formatLines(tr).join('\n');
}

/** Short, display-friendly detail line for the recent[] log. */
function describe(evt) {
  switch (evt.hook_event_name) {
    case 'UserPromptSubmit':
      return typeof evt.prompt === 'string' ? evt.prompt.slice(0, 200) : '';
    case 'PreToolUse':
    case 'PostToolUse':
      return evt.tool_name || '';
    case 'Notification':
      return evt.message || '';
    case 'PreCompact':
      return evt.trigger || '';
    case 'SessionStart':
    case 'SessionEnd':
      return evt.source || evt.reason || '';
    case 'Stop':
    case 'StopFailure':
      return typeof evt.last_assistant_message === 'string' ? evt.last_assistant_message.slice(0, 200) : '';
    default:
      return '';
  }
}

/**
 * Full, untruncated text for an event — what consumers that can show long-form
 * content (e.g. board stickies) should display, as opposed to the one-line
 * `describe()` summary used by the feed/terminal. Empty when there's nothing
 * substantial beyond the short detail.
 */
function fullText(evt) {
  switch (evt.hook_event_name) {
    case 'UserPromptSubmit':
      return typeof evt.prompt === 'string' ? evt.prompt : '';
    case 'PreToolUse': {
      const name = evt.tool_name || 'tool';
      const ti = evt.tool_input;
      if (!ti || typeof ti !== 'object') return name;
      // Show every parameter of the tool call, one per line. Objects/arrays are
      // JSON-encoded; strings are kept verbatim (the stickie scrolls if long).
      const lines = Object.entries(ti).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
      return lines.length ? `${name}\n${lines.join('\n')}` : name;
    }
    case 'PostToolUse':
    case 'PostToolUseFailure': {
      const name = evt.tool_name || 'tool';
      const out = toolOutputText(evt.tool_response);
      return out ? `${name}\n${out}` : name;
    }
    case 'Stop':
    case 'StopFailure':
      return typeof evt.last_assistant_message === 'string' ? evt.last_assistant_message : '';
    default:
      return '';
  }
}

class ClaudeSessionStore extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} */
    this.sessions = new Map();
  }

  /** Create the blank state for a freshly-seen session id. */
  _blank(id, at) {
    return {
      sessionId: id,
      cwd: undefined,
      status: 'idle', // idle | working | blocked | done | error
      prompt: undefined, // current/most-recent user prompt
      turnCount: 0,
      toolCalls: 0, // completed tool calls (count)
      toolFailures: 0,
      activeTool: null, // tool name while a PreToolUse is open
      lastResult: null, // summary of the last completed tool call
      lastResponse: null, // full assistant text, from Stop's last_assistant_message field
      pendingPermission: null, // {message, at} while blocked on a permission/notification
      subagents: [], // {name, startedAt, finishedAt}
      tasks: { total: 0, completed: 0 },
      error: null,
      recent: [], // {at, event, detail} ring buffer, newest last
      turns: [], // [{index, prompt, status, startedAt, finishedAt, toolCalls:[...]}]
      startedAt: at,
      updatedAt: at,
      finishedAt: null,
      // internal: tool calls opened but not yet closed, for pairing
      _pending: [],
    };
  }

  _get(id, at) {
    let s = this.sessions.get(id);
    if (!s) {
      s = this._blank(id, at);
      this.sessions.set(id, s);
    }
    return s;
  }

  _currentTurn(s, at) {
    // The active turn is the last one that hasn't ended. If events arrive
    // before any UserPromptSubmit (e.g. attaching mid-session), open an
    // implicit turn so tool calls still have a home.
    const last = s.turns[s.turns.length - 1];
    if (last && last.status === 'active') return last;
    const turn = { index: s.turns.length, prompt: s.prompt, status: 'active', startedAt: at, finishedAt: null, toolCalls: [] };
    s.turns.push(turn);
    s.turnCount = s.turns.length;
    return turn;
  }

  /**
   * Ingest one hook event. `evt` is the parsed payload; `evt.receivedAt` is the
   * forwarder's receive timestamp (ms). Returns the updated SessionState.
   */
  ingest(evt) {
    const id = evt.session_id || 'unknown';
    const at = evt.receivedAt || Date.now();
    const s = this._get(id, at);
    s.updatedAt = at;
    if (evt.cwd) s.cwd = evt.cwd;

    switch (evt.hook_event_name) {
      case 'SessionStart': {
        s.status = 'idle';
        s.finishedAt = null;
        break;
      }
      case 'UserPromptSubmit': {
        // Close any still-open turn, then open a new one.
        const open = s.turns[s.turns.length - 1];
        if (open && open.status === 'active') open.status = 'done';
        s.prompt = typeof evt.prompt === 'string' ? evt.prompt : s.prompt;
        s.status = 'working';
        s.pendingPermission = null;
        const turn = { index: s.turns.length, prompt: s.prompt, status: 'active', startedAt: at, finishedAt: null, toolCalls: [] };
        s.turns.push(turn);
        s.turnCount = s.turns.length;
        break;
      }
      case 'PreToolUse': {
        const turn = this._currentTurn(s, at);
        const call = {
          toolUseId: evt.tool_use_id || null,
          name: evt.tool_name || 'unknown',
          input: evt.tool_input,
          output: undefined,
          ok: undefined,
          startedAt: at,
          finishedAt: null,
          durationMs: null,
        };
        turn.toolCalls.push(call);
        s._pending.push(call);
        s.activeTool = call.name;
        s.status = 'working';
        // A Task tool launch is a subagent starting.
        if (call.name === 'Task') {
          s.tasks.total += 1;
          s.subagents.push({ name: (evt.tool_input && evt.tool_input.subagent_type) || 'subagent', startedAt: at, finishedAt: null });
        }
        break;
      }
      case 'PostToolUse': {
        const call = this._matchPending(s, evt);
        const failed = isFailure(evt.tool_response);
        if (call) {
          call.finishedAt = at;
          call.durationMs = Math.max(0, at - call.startedAt);
          call.output = evt.tool_response;
          call.ok = !failed;
        }
        s.toolCalls += 1;
        if (failed) s.toolFailures += 1;
        s.activeTool = null;
        s.lastResult = call
          ? { name: call.name, ok: call.ok, durationMs: call.durationMs, finishedAt: at }
          : { name: evt.tool_name || 'unknown', ok: !failed, durationMs: null, finishedAt: at };
        if (failed) s.error = `${evt.tool_name || 'tool'} failed`;
        break;
      }
      case 'Notification': {
        // Notifications surface permission prompts and idle/waiting states.
        const msg = evt.message || '';
        s.pendingPermission = { message: msg, at };
        s.status = 'blocked';
        break;
      }
      case 'SubagentStop': {
        s.tasks.completed += 1;
        const open = s.subagents.find((x) => x.finishedAt == null);
        if (open) open.finishedAt = at;
        break;
      }
      case 'PreCompact': {
        // Context compaction — recorded for the timeline; not a state change.
        break;
      }
      case 'Stop':
      case 'StopFailure': {
        const open = s.turns[s.turns.length - 1];
        if (open && open.status === 'active') {
          open.status = evt.hook_event_name === 'StopFailure' ? 'error' : 'done';
          open.finishedAt = at;
        }
        // Claude Code puts the final reply text right in the Stop payload
        // (absent for tool-only or interrupted turns) — no transcript parsing.
        if (typeof evt.last_assistant_message === 'string') {
          s.lastResponse = evt.last_assistant_message;
        }
        s.activeTool = null;
        s.pendingPermission = null;
        s.status = evt.hook_event_name === 'StopFailure' ? 'error' : 'idle';
        break;
      }
      case 'SessionEnd': {
        s.status = 'done';
        s.finishedAt = at;
        s.activeTool = null;
        break;
      }
      default:
        break;
    }

    // Append to the recent[] ring buffer. `detail` is the one-line summary used
    // by the feed/terminal; `text` carries the untruncated content for long-form
    // consumers (board stickies). `text` is omitted when it adds nothing.
    const detail = describe(evt);
    const full = fullText(evt);
    const entry = { at, event: evt.hook_event_name || 'unknown', detail };
    if (full && full !== detail) entry.text = full;
    s.recent.push(entry);
    if (s.recent.length > RECENT_CAP) s.recent.splice(0, s.recent.length - RECENT_CAP);

    this.emit('change', id);
    return s;
  }

  /** Pair a PostToolUse with its open PreToolUse call. */
  _matchPending(s, evt) {
    if (!s._pending.length) return null;
    let idx = -1;
    if (evt.tool_use_id) {
      idx = s._pending.findIndex((c) => c.toolUseId === evt.tool_use_id);
    }
    if (idx < 0 && evt.tool_name) {
      // FIFO fallback: oldest open call with the same tool name.
      idx = s._pending.findIndex((c) => c.name === evt.tool_name);
    }
    if (idx < 0) idx = 0; // last resort: oldest open call
    const [call] = s._pending.splice(idx, 1);
    return call || null;
  }

  /** Public, serializable snapshot of all sessions (internal fields stripped). */
  snapshot() {
    return Array.from(this.sessions.values()).map((s) => {
      const { _pending, ...pub } = s;
      return pub;
    });
  }

  clear() {
    this.sessions.clear();
  }
}

module.exports = { ClaudeSessionStore };
