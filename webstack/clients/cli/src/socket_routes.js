/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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
  const wsopts = {
    withCredentials: true,
    headers: {
      Cookie: cookies,
    },
  };

  const socket = new WebSocket(server, wsopts);

  socket.addEventListener('close', (event) => {
    console.log('Connection Closed');
  });

  socket.addEventListener('error', (event) => {
    console.log('Connection Error', event.message);
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
  console.log('JWT> socketConnectionJWT', server);
  const wsopts = {
    withCredentials: true,
    // JWT token
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  const socket = new WebSocket(server, wsopts);

  socket.addEventListener('close', (event) => {
    console.log('Connection Closed');
  });

  socket.addEventListener('error', (event) => {
    console.log('Connection Error', event.message);
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
