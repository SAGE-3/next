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

import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

// parsing command-line arguments
import * as commander from 'commander';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// Some utitlity functions
import { randomNumber, clamp } from './src/utils.js';
// HTTP protocol
import { loginGuestUser, loginCreateUser, getUserInfo, getBoardsInfo, getRoomsInfo } from './src/http_routes.js';
// WS protocol
import { socketConnection, boardConnect, boardDisconnect, sendCursor, presenceUpdate } from './src/socket_routes.js';

// Fake user
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
  .option('-r, --rate <n>', 'framerate (number)', 20)
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

async function start() {
  // Login through HTTP
  const cookies = await loginGuestUser('https://' + params.server);
  console.log('CLI> Logged in');

  // Build a user
  const randomName = faker.name.fullName();
  const randomEmail = faker.internet.email();
  const randomAvatar = faker.image.avatar();
  const userData = {
    name: randomName,
    email: randomEmail,
    color: colors[randomNumber(0, colors.length - 1)],
    profilePicture: randomAvatar,
    userRole: 'user',
    userType: 'client',
  };

  const me = await loginCreateUser('https://' + params.server, userData);
  myID = me._id;

  // Get my own info: uid, name, email, color, emailVerified, profilePicture
  // const userData = await getUserInfo();

  // board name from command argument (or board0)
  const boardId = params.board;
  const roomId = params.room;

  const boardData = await getBoardsInfo();
  console.log('CLI> boards', boardData);
  const roomData = await getRoomsInfo();
  console.log('CLI> rooms', roomData);

  // Create a websocket with the auth cookies
  const socket = socketConnection('wss://' + params.server + '/api', cookies);

  // When socket connected
  socket.on('open', () => {
    console.log('socket> connected');

    // Connect to a specific board
    console.log('socket> connecting to board', roomId, boardId);
    boardConnect(socket, myID, roomId, boardId);

    // Default size of the board
    const totalWidth = 3000;
    const totalHeight = 3000;

    // Random position within a safe margin
    var px = randomNumber(1500000, 1501000);
    var py = randomNumber(1500000, 1501000);
    var incx = randomNumber(1, 2) % 2 ? 1 : -1;
    var incy = randomNumber(1, 2) % 2 ? 1 : -1;
    var sensitivity = params.sensitivity;

    // intial position
    sendCursor(socket, myID, px, py);

    // Set a limit on runtime
    setTimeout(() => {
      console.log('CLI> done');
      // Leave the board
      boardDisconnect(socket, boardId);
      // and quit
      process.exit(1);
    }, params.timeout * 1000);

    // Send cursor position on repeat
    setInterval(() => {
      // step between 0 and 10 pixels
      const movementX = randomNumber(1, 20);
      const movementY = randomNumber(1, 20);
      // scaled up for wall size
      const dx = Math.round(movementX * sensitivity);
      const dy = Math.round(movementY * sensitivity);
      // detect wall size limits and reverse course
      if (px >= totalWidth + 1500000) incx *= -1;
      if (px <= 1500000) incx *= -1;
      if (py >= totalHeight + 1500000) incy *= -1;
      if (py <= 1500000) incy *= -1;
      // update global position
      px = clamp(px + incx * dx, 1500000, 1500000 + totalWidth);
      py = clamp(py + incy * dy, 1500000, 1500000 + totalHeight);

      // Send message to server
      sendCursor(socket, myID, px, py);
    }, updateRate);

    // Print my position from the server updates
    // presenceUpdate(socket, (data) => {
    //   data.map((v, i, arr) => {
    //     if (v.id === myID) {
    //       console.log('User>', v.name, -v.cursor[0], -v.cursor[1]);
    //     }
    //   });
    // });
  });
}

// Start the whole thing
start();
