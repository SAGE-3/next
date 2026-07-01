/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * End-to-end smoke test for the Claude Code monitor comms layer, with no
 * Electron involved. It stands up a real ClaudeSocketServer on an isolated
 * temp socket, plays a realistic hook-event sequence through it exactly as the
 * forwarder would (connect, write one JSON line, close), then asserts the
 * resulting ClaudeSessionStore snapshot.
 *
 * Run:  node src/claude/smoke-test.js
 * Exits non-zero if any assertion fails.
 */

const net = require('net');
const os = require('os');
const path = require('path');
const { ClaudeSessionStore } = require('./session-store');
const { ClaudeSocketServer } = require('./socket-server');

const TEST_SOCKET = path.join(os.tmpdir(), `sage3-claude-smoke-${process.pid}.sock`);
const SID = 'sess-smoke-1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Send one event the way the forwarder does: open, write one line, close.
function send(evt) {
  return new Promise((resolve, reject) => {
    const line = JSON.stringify({ ...evt, session_id: SID, receivedAt: Date.now() }) + '\n';
    const c = net.createConnection(TEST_SOCKET, () => c.end(line));
    c.on('close', resolve);
    c.on('error', reject);
  });
}

let failures = 0;
function check(label, cond) {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failures += 1;
  }
}

async function main() {
  const store = new ClaudeSessionStore();
  let changes = 0;
  store.on('change', () => (changes += 1));

  const server = new ClaudeSocketServer(store, (m) => console.log(m), TEST_SOCKET);
  server.start();
  await sleep(50);

  // A realistic single turn: read a file (ok), run a command (fails), launch a
  // subagent (Task) that finishes, hit a permission notification, then stop.
  await send({ hook_event_name: 'SessionStart', source: 'startup', cwd: '/tmp/project' });
  await send({ hook_event_name: 'UserPromptSubmit', prompt: 'Fix the failing test' });

  await send({ hook_event_name: 'PreToolUse', tool_use_id: 'tu1', tool_name: 'Read', tool_input: { file_path: '/a.js' } });
  await sleep(20);
  await send({ hook_event_name: 'PostToolUse', tool_use_id: 'tu1', tool_name: 'Read', tool_response: { ok: true } });

  await send({ hook_event_name: 'PreToolUse', tool_use_id: 'tu2', tool_name: 'Bash', tool_input: { command: 'npm test' } });
  await sleep(20);
  await send({ hook_event_name: 'PostToolUse', tool_use_id: 'tu2', tool_name: 'Bash', tool_response: { error: 'exit 1' } });

  await send({ hook_event_name: 'PreToolUse', tool_use_id: 'tu3', tool_name: 'Task', tool_input: { subagent_type: 'Explore' } });
  await send({ hook_event_name: 'SubagentStop' });
  await send({ hook_event_name: 'PostToolUse', tool_use_id: 'tu3', tool_name: 'Task', tool_response: { ok: true } });

  await send({ hook_event_name: 'Notification', message: 'Claude needs your permission to use Bash' });
  await send({ hook_event_name: 'Stop', stop_hook_active: false });

  await sleep(80); // let the last events drain

  const snap = store.snapshot();
  console.log('\nSnapshot:\n', JSON.stringify(snap, null, 2), '\n');

  console.log('Assertions:');
  check('one session captured', snap.length === 1);
  const s = snap[0] || {};
  check('session id matches', s.sessionId === SID);
  check('cwd captured', s.cwd === '/tmp/project');
  check('turnCount === 1', s.turnCount === 1);
  check('completed toolCalls === 3', s.toolCalls === 3);
  check('toolFailures === 1', s.toolFailures === 1);
  check('tasks total === 1', s.tasks && s.tasks.total === 1);
  check('tasks completed === 1', s.tasks && s.tasks.completed === 1);
  check('one subagent, finished', s.subagents && s.subagents.length === 1 && s.subagents[0].finishedAt != null);
  check('turn has 3 tool calls', s.turns && s.turns[0] && s.turns[0].toolCalls.length === 3);
  const calls = (s.turns && s.turns[0] && s.turns[0].toolCalls) || [];
  check('Read call ok with duration', calls[0] && calls[0].name === 'Read' && calls[0].ok === true && calls[0].durationMs >= 0);
  check('Bash call failed', calls[1] && calls[1].name === 'Bash' && calls[1].ok === false);
  check('Bash duration paired (>0)', calls[1] && calls[1].durationMs >= 20);
  check('lastResult is the Task call', s.lastResult && s.lastResult.name === 'Task');
  check('error recorded from Bash failure', typeof s.error === 'string' && s.error.includes('Bash'));
  check('final status idle (after Stop)', s.status === 'idle');
  check('permission notification recorded', s.recent.some((r) => r.event === 'Notification'));
  check('change events fired', changes >= 10);

  server.stop();

  if (failures) {
    console.log(`\n${failures} assertion(s) FAILED`);
    process.exit(1);
  }
  console.log('\nAll assertions passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error('smoke-test crashed:', e);
  process.exit(1);
});
