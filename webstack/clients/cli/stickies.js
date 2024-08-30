/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * @server main cli function.
 * @author <a href="mailto:renambot@gmail.com">Luc Renambot</a>
 * @version 1.0.0
 */

/**
 * Node Modules
 */
import * as fsModule from 'fs';
// Declare fs with Promises
const fs = fsModule.promises;
import { v4 } from 'uuid';

import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

// parsing command-line arguments
import * as commander from 'commander';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// Some utitlity functions
import { randomNumber, clamp } from './src/utils.js';
// WS protocol
import { loginJWT, loadToken, getBoards, getRooms } from './src/jwt_routes.js';
import { boardConnect, boardDisconnect, socketConnectionJWT } from './src/socket_routes.js';

import { faker } from '@faker-js/faker';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .option('-b, --board <s>', 'board id (string))')
  .option('-m, --room <s>', 'room id (string))')
  .option('-t, --timeout <n>', 'runtime in sec (number)', 10)
  .option('-r, --rate <n>', 'framerate (number)', 2)
  .option('-d, --delay <n>', 'delay between stickies in sec (number)', 2)
  .option('-s, --server <s>', 'Server URL (string)', 'localhost:3333')
  .option('-e, --sensitivity <n>', 'sensitivity (number)', 5);

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

let myID;
var FPS = params.rate;
var updateRate = 1000 / FPS;

const colors = ['green', 'blue', 'gray', 'orange', 'purple', 'yellow', 'red', 'cyan', 'teal', 'pink'];

function createStickie(socket, roomId, boardId, title, x, y) {
  console.log('CLI> create stickie', roomId, boardId, title, x, y);
  const c = Math.floor(Math.random() * colors.length);
  const text = faker.lorem.sentence();
  const body = {
    boardId: boardId,
    dragging: false,
    position: { x: x, y: y, z: 0 },
    raised: true,
    roomId: roomId,
    rotation: { x: 0, y: 0, z: 0 },
    size: { width: 400, height: 420, depth: 0 },
    state: { text: text, fontSize: 36, color: colors[c], lock: false },
    title: title,
    type: 'Stickie',
  };

  socket.send(
    JSON.stringify({
      id: v4(),
      route: '/api/apps/',
      method: 'POST',
      body: body,
    })
  );
}

async function start() {
  // Test login through HTTP and set token to the axios instance
  const token = loadToken('token.json');
  console.log('JWT> got token');

  const me = await loginJWT('http://' + params.server, token);
  console.log('CLI> user', me.user);
  myID = me.user.id;

  // board name from command argument (or board0)
  // const boardId = params.board;
  // const roomId = params.room;

  const boardData = await getBoards();
  console.log('CLI> boards', boardData.length, boardData[0]);
  const roomData = await getRooms();
  console.log('CLI> rooms', roomData.length, roomData[0]);

  // Create a websocket with the auth cookies
  const socket = socketConnectionJWT('ws://' + params.server + '/api', token);

  // When socket connected
  socket.on('open', () => {
    console.log('socket> connected');

    //   // Default size of the board
    //   const totalWidth = 3000;
    //   const totalHeight = 3000;

    //   // Random position within a safe margin
    //   var px = randomNumber(1500000, 1501000);
    //   var py = randomNumber(1500000, 1501000);
    //   var incx = randomNumber(1, 2) % 2 ? 1 : -1;
    //   var incy = randomNumber(1, 2) % 2 ? 1 : -1;
    //   var sensitivity = params.sensitivity;

    //   // Set a limit on runtime
    //   setTimeout(() => {
    //     console.log('CLI> done');
    //     // Leave the board
    //     boardDisconnect(socket, boardId);
    //     // and quit
    //     process.exit(1);
    //   }, params.timeout * 1000);

    //   // Calculate cursor position
    //   setInterval(() => {
    //     // step between 0 and 10 pixels
    //     const movementX = randomNumber(1, 20);
    //     const movementY = randomNumber(1, 20);
    //     // scaled up for wall size
    //     const dx = Math.round(movementX * sensitivity);
    //     const dy = Math.round(movementY * sensitivity);
    //     // detect wall size limits and reverse course
    //     if (px >= totalWidth + 1500000) incx *= -1;
    //     if (px <= 1500000) incx *= -1;
    //     if (py >= totalHeight + 1500000) incy *= -1;
    //     if (py <= 1500000) incy *= -1;
    //     // update global position
    //     px = clamp(px + incx * dx, 1500000, 1500000 + totalWidth);
    //     py = clamp(py + incy * dy, 1500000, 1500000 + totalHeight);
    //   }, updateRate);

    // setInterval(() => {
    //   createStickie(socket, roomId, boardId, faker.name.fullName(), px, py);
    // }, params.delay * 1000);
  });
}

// Start the whole thing
start();
