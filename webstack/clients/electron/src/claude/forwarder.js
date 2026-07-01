#!/usr/bin/env node
/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Claude Code hook forwarder.
 *
 * Registered in ~/.claude/settings.json as the `command` for each hook event.
 * Claude Code runs it once per event, passing the event payload as JSON on
 * stdin (the payload already contains `hook_event_name`, `session_id`, etc.).
 *
 * The forwarder writes that payload as one newline-delimited JSON line to the
 * SAGE3 monitor's Unix domain socket, then exits.
 *
 * Hard rules, because Claude Code *waits* for this process on every event:
 *   - Never block. A short timeout guarantees we exit even if nothing listens.
 *   - Never print to stdout. Some hooks treat stdout as instructions to Claude;
 *     staying silent keeps the forwarder transparent.
 *   - Always exit 0. A non-zero code can cancel the tool call / prompt. If the
 *     monitor isn't running (ENOENT / ECONNREFUSED), we simply drop the event.
 */

const net = require('net');
const { SOCKET_PATH } = require('./socket-path');

const HARD_TIMEOUT_MS = 500; // absolute upper bound on our lifetime
const CONNECT_TIMEOUT_MS = 300;

// Backstop: whatever happens, do not keep Claude Code waiting.
const killTimer = setTimeout(() => process.exit(0), HARD_TIMEOUT_MS);
killTimer.unref();

function done() {
  clearTimeout(killTimer);
  process.exit(0);
}

// Read the full event payload from stdin.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  // Stamp the moment we received it; the store uses this for timing when the
  // payload carries no timestamp of its own.
  let line;
  try {
    const payload = JSON.parse(input);
    payload.receivedAt = Date.now();
    line = JSON.stringify(payload) + '\n';
  } catch {
    // Unparseable stdin: nothing useful to forward, leave quietly.
    done();
    return;
  }

  const socket = net.createConnection(SOCKET_PATH);
  socket.setTimeout(CONNECT_TIMEOUT_MS);
  socket.on('connect', () => socket.end(line));
  socket.on('timeout', () => socket.destroy());
  // ENOENT (no socket file) / ECONNREFUSED (monitor down): drop silently.
  socket.on('error', () => done());
  socket.on('close', () => done());
});
process.stdin.on('error', () => done());
