/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Unix domain socket server that receives Claude Code hook events from the
 * forwarder and feeds them into a ClaudeSessionStore. Pure `net` + Node, no
 * Electron dependency.
 *
 * Wire format: newline-delimited JSON. Each connection is short-lived (the
 * forwarder writes one line and closes), but the parser tolerates multiple
 * lines per connection and lines split across chunks.
 */

const net = require('net');
const fs = require('fs');
const { SOCKET_PATH, ensureDir } = require('./socket-path');

class ClaudeSocketServer {
  /**
   * @param {import('./session-store').ClaudeSessionStore} store
   * @param {(msg: string) => void} [log]
   * @param {string} [socketPath]  override the default socket (used by tests)
   */
  constructor(store, log, socketPath) {
    this.store = store;
    this.log = log || (() => {});
    this.socketPath = socketPath || SOCKET_PATH;
    this.server = null;
  }

  start() {
    ensureDir();
    // Remove a stale socket file left by a previous run, else listen() throws
    // EADDRINUSE on a path that no longer has a live listener.
    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      /* not present — fine */
    }

    this.server = net.createServer((conn) => this._onConnection(conn));
    this.server.on('error', (err) => this.log(`[claude] socket server error: ${err.message}`));
    this.server.listen(this.socketPath, () => this.log(`[claude] listening on ${this.socketPath}`));
    return this;
  }

  _onConnection(conn) {
    let buffer = '';
    conn.setEncoding('utf8');
    conn.on('data', (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        this._handleLine(line);
      }
    });
    conn.on('end', () => {
      // Flush a trailing line that wasn't newline-terminated.
      if (buffer.trim()) this._handleLine(buffer);
    });
    conn.on('error', () => {
      /* forwarder may vanish mid-write; ignore */
    });
  }

  _handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let evt;
    try {
      evt = JSON.parse(trimmed);
    } catch (e) {
      this.log(`[claude] dropping malformed event: ${e.message}`);
      return;
    }
    // Debug: one line per received hook event.
    const sid = evt.session_id ? String(evt.session_id).slice(0, 8) : '????????';
    const extra =
      evt.tool_name || evt.message || evt.prompt || evt.last_assistant_message || evt.source || evt.reason || evt.trigger || '';
    const detail = extra ? ` ${String(extra).replace(/\s+/g, ' ').slice(0, 80)}` : '';
    this.log(`[claude] hook ${evt.hook_event_name || 'unknown'} (sess ${sid})${detail}`);
    try {
      this.store.ingest(evt);
    } catch (e) {
      this.log(`[claude] ingest error: ${e.message}`);
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      /* ignore */
    }
  }
}

module.exports = { ClaudeSocketServer };
