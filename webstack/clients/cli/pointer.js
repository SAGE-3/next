/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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

// parsing command-line arguments
import * as commander from 'commander';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// Some utitlity functions
import { randomNumber, clamp } from './src/utils.js';
// HTTP protocol
import { loginGuestUser, getUserInfo, getBoardsInfo, getBoardState } from './src/http_routes.js';
// WS protocol
import { socketConnection, boardConnect, boardDisconnect, sendCursor, presenceUpdate } from './src/socket_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .option('-b, --board <s>', 'board id (string))')
  .option('-t, --timeout <n>', 'runtime in sec (number)', 10)
  .option('-r, --rate <n>', 'framerate (number)', 10)
  .option('-s, --server <s>', 'Server URL (string)', 'http://localhost:3333');

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

let myID;
var FPS = params.rate;
var updateRate = 1000 / FPS;

async function start() {
  // Login through HTTP
  const cookies = await loginGuestUser(params.server);
  console.log('CLI> Logged in');

  // Get my own info: uid, name, email, color, emailVerified, profilePicture
  const userData = await getUserInfo();
  console.log('CLI> user:', userData.name, userData.color, userData.id);
  // save my ID for later
  myID = userData.id;

  // board name from command argument (or board0)
  const boardId = params.board;

  const boardData = await getBoardsInfo();
  console.log('CLI> boards', boardData);

  const state = await getBoardState(boardId);
  console.log('CLI> board', boardId, state);

  // Create a websocket with the auth cookies
  const socket = socketConnection(params.server, cookies);

  // When socket connected
  socket.on('connect', () => {
    console.log('socket> connected');

    // Connect to a specific board
    boardConnect(socket, boardId);

    // Default size of the board
    const totalWidth = 8192;
    const totalHeight = 4608;

    // Random position within a safe margin
    var px = randomNumber(100, totalWidth - 100);
    var py = randomNumber(100, totalHeight - 100);
    var incx = 1;
    var incy = 1;
    var sensitivity = 5;

    // intial position
    sendCursor(socket, px, py);

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
      if (px >= totalWidth) incx *= -1;
      if (px <= 0) incx *= -1;
      if (py >= totalHeight) incy *= -1;
      if (py <= 0) incy *= -1;
      // update global position
      px = clamp(px + incx * dx, 0, totalWidth);
      py = clamp(py + incy * dy, 0, totalHeight);

      // Send message to server
      sendCursor(socket, px, py);
    }, updateRate);

    // Print my position from the server updates
    presenceUpdate(socket, (data) => {
      data.map((v, i, arr) => {
        if (v.id === myID) {
          console.log('User>', v.name, -v.cursor[0], -v.cursor[1]);
        }
      });
    });
  });
}

// Start the whole thing
start();
