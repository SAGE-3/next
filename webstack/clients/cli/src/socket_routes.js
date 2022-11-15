/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Websocket
import { WebSocket } from 'ws';
import { v1 } from 'uuid';

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
    withCredentials: true,
    headers: {
      Cookie: cookies,
    },
  };

  // socketio v4 api
  const socket = new WebSocket(server, wsopts);

  // socket.addEventListener('open', (event) => {
  //   console.log('Connection Open');
  // });

  // socket.addEventListener('message', (ev) => this.processServerMessage(ev));

  socket.addEventListener('close', (event) => {
    console.log('Connection Closed');
    // this._socket.removeEventListener('message', (ev) => this.processServerMessage(ev));
  });

  socket.addEventListener('error', (event) => {
    console.log('Connection Error', event.message);
    // socket.removeEventListener('message', (ev) => this.processServerMessage(ev));
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
    auth: { token: token },
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
export function sendCursor(socket, id, x, y) {
  socket.send(
    JSON.stringify({
      id: '1',
      route: '/api/presence/' + id,
      method: 'PUT',
      body: { cursor: { x: x, y: y, z: 0 } },
    })
  );
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
  // socket.send('board-disconnect', { boardId });
}

/**
 * Connect to a board and send local time
 *
 * @param {ws} socket
 * @param {string} boardId
 */
export function boardConnect(socket, id, roomId, boardId) {
  const payload = JSON.stringify({
    id: v1(),
    route: '/api/presence/' + id,
    method: 'PUT',
    body: {
      roomId: roomId,
      boardId: boardId,
    },
  });
  socket.send(payload);
}
