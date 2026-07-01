/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Single source of truth for the Claude Code <-> SAGE3 monitor Unix domain
 * socket. Shared by both ends of the pipe:
 *   - the forwarder script, run by Claude Code as a hook (plain Node, no Electron)
 *   - the socket server, run inside the Electron main process
 *
 * It must resolve to the same path in both processes without depending on the
 * Electron runtime, so it is derived from the user's home directory rather than
 * app.getPath('userData'). The home dir keeps the path short, which matters:
 * macOS caps Unix socket paths at ~104 bytes.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const DIR = path.join(os.homedir(), '.sage3');
const SOCKET_PATH = path.join(DIR, 'claude.sock');

/** Ensure the parent directory exists. Safe to call repeatedly. */
function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

module.exports = { SOCKET_PATH, DIR, ensureDir };
