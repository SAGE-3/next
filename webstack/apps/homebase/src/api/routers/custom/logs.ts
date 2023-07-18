/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { WebSocket } from 'ws';

const clients: Array<WebSocket> = [];

export function setupWsforLogs(socket: WebSocket) {
  console.log('logsServer> connection opened');
  clients.push(socket);

  socket.on('message', (msg) => {
    console.log('logsServer> message received:', msg);
  });

  socket.on('close', () => {
    console.log('logsServer> connection closed');
    // Delete the socket from the clients array
    const index = clients.indexOf(socket, 0);
    if (index > -1) {
      clients.splice(index, 1);
    }
    console.log('logsServer> connection #', Object.keys(clients).length);
  });

  socket.on('error', () => {
    console.log('logsServer> error');
    // Delete the socket from the clients array
    const index = clients.indexOf(socket, 0);
    if (index > -1) {
      clients.splice(index, 1);
    }
    console.log('logsServer> connection #', Object.keys(clients).length);
  });
}

/*
 * Broadcast a message to all clients
 *
 * @param {string} name
 * @param {*} data
 * */
function emitLog(name: string, data: any) {
  const msg = JSON.stringify({ type: name, data: data });
  for (const k in clients) {
    const sock = clients[k];
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(msg);
    }
  }
}

/**
 * Route for clients to get the SERVER time
 * @returns
 */
export function LogsRouter(): express.Router {
  const router = express.Router();
  router.post('/', async (req, res) => {
    // Send the message to all clients
    emitLog('log', req.body);
    res.status(200).send({ success: true, message: 'OK' });
  });

  return router;
}
