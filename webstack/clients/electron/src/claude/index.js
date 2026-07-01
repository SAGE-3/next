/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Claude Code monitor — main-process integration.
 *
 * Owns the ClaudeSessionStore + Unix socket server and bridges them to the
 * renderer over IPC:
 *   - ipcMain.handle('claude:getSessions')  -> current snapshot (initial pull)
 *   - webContents 'claude:sessions'         -> throttled live snapshots (~100ms)
 *
 * The preload exposes these as window.claude.getSessions() / onSessions(cb).
 *
 * Headless-safe: if no windows exist the broadcast is simply skipped, and a
 * failure to bind the socket is logged but never throws into app startup.
 */

const { ClaudeSessionStore } = require('./session-store');
const { ClaudeSocketServer } = require('./socket-server');

const THROTTLE_MS = 100;

let store = null;
let server = null;
let getWindows = () => [];
let throttleTimer = null;
let pendingBroadcast = false;

function broadcast() {
  const snap = store.snapshot();
  for (const win of getWindows()) {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('claude:sessions', snap);
    }
  }
}

function scheduleBroadcast() {
  if (throttleTimer) {
    pendingBroadcast = true;
    return;
  }
  broadcast();
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    if (pendingBroadcast) {
      pendingBroadcast = false;
      scheduleBroadcast();
    }
  }, THROTTLE_MS);
}

/**
 * Start the monitor.
 * @param {object} opts
 * @param {Electron.IpcMain} [opts.ipcMain]   register the getSessions handler
 * @param {() => Electron.BrowserWindow[]} [opts.getWindows]  broadcast targets
 * @param {(msg: string) => void} [opts.log]
 * @returns {ClaudeSessionStore}
 */
function start(opts = {}) {
  if (store) return store; // idempotent
  const log = opts.log || (() => {});
  getWindows = opts.getWindows || (() => []);

  store = new ClaudeSessionStore();
  store.on('change', scheduleBroadcast);

  server = new ClaudeSocketServer(store, log);
  try {
    server.start();
  } catch (e) {
    log(`[claude] failed to start socket server: ${e.message}`);
  }

  if (opts.ipcMain) {
    opts.ipcMain.handle('claude:getSessions', () => store.snapshot());
  }

  return store;
}

function stop() {
  if (server) server.stop();
  if (throttleTimer) clearTimeout(throttleTimer);
  throttleTimer = null;
  pendingBroadcast = false;
  server = null;
  store = null;
}

function getStore() {
  return store;
}

module.exports = { start, stop, getStore };
