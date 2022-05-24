/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Websocket socketio v4+
import { io } from "socket.io-client";

/**
 * Connect to a server with the auth cookies
 *
 * @param {string} server
 * @param {any} cookies
 * @returns
 */
export function socketConnection(server, cookies) {
  // socketio options with login info
  const wsopts = {
    path: '/api/connect-ws',
    withCredentials: true,
    extraHeaders: {
      Cookie: cookies,
    },
  };

  // socketio v4 api
  const socket = io(server, wsopts);

  socket.on('disconnect', (e) => {
    console.log('Socket> disconnect', e);
    // and quit
    process.exit(1);
  });

  socket.on('connect_error', (e) => {
    console.log('Socket> connect_error', e);
    // and quit
    process.exit(1);
  });

  return socket;
}

/**
 * Connect to a server with JWT token
 *
 * @param {string} server
 * @param {any} token
 * @returns
 */
export function socketConnectionJWT(server, token) {
  // socketio options with token as query parameter in the url: /api/connect-ws/?token=xxx
  const wsopts = {
    path: '/api/connect-ws',
    withCredentials: true,
    // JWT token
    auth: { token: token }
  };

  // socketio v4 api
  const socket = io(server, wsopts);

  socket.on('disconnect', (e) => {
    console.log('Socket> disconnect', e);
    // and quit
    process.exit(1);
  });

  socket.on('connect_error', (e) => {
    console.log('Socket> connect_error', e);
    // and quit
    process.exit(1);
  });

  return socket;
}
/**
 * Send cursor position (negative values)
 *
 * @param {any} socket
 * @param {number} x
 * @param {number} y
 */
export function sendCursor(socket, x, y) {
  socket.emit('presence-cursor', { c: [-x, -y] });
}

/**
 * Set a callback on presence update
 *
 * @param {any} socket
 * @param {funtion} cb
 */
 export function presenceUpdate(socket, cb) {
  socket.on('presence-update', cb);
}

/**
 * Set a callback on presence update
 *
 * @param {any} socket
 * @param {funtion} cb
 */
 export function cursorUpdate(socket, cb) {
  socket.on('presence-cursor', cb);
}

/**
 * Disconnect from a board
 *
 * @param {ws} socket
 * @param {string} boardId
 */
export function boardDisconnect(socket, boardId) {
  socket.emit('board-disconnect', { boardId });
}

/**
 * Connect to a board and send local time
 *
 * @param {ws} socket
 * @param {string} boardId
 */
export function boardConnect(socket, boardId) {
  // Connect to a board, and get updates
  socket.emit('board-connect', { boardId });

  // Local time
  const timePayload = {
    timeOffset: new Date().getTimezoneOffset(),
    timeZone: new Date().toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ')[2],
  };
  socket.emit('presence-time', timePayload);
}
