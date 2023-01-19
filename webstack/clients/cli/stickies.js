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

// parsing command-line arguments
import * as commander from 'commander';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// HTTP protocol
import { loginGuestUser, getUserInfo, getInstance, getBoardsInfo } from './src/http_routes.js';
// WS protocol
import { socketConnection } from './src/socket_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .option('-b, --board <n>', 'board id (int)', 0)
  .option('-s, --server <s>', 'Server URL (string)', 'http://localhost:3333')
  .option('-x, --positionx <n>', 'Position X (number)', 300)
  .option('-y, --positiony <n>', 'Position Y (number)', 300)
  .option('-t, --text <s>', 'Text (string)', 'Bla bla bla');

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

async function start() {
  // Login through HTTP
  const cookies = await loginGuestUser(params.server);
  console.log('CLI> Logged in');

  // Get my own info: uid, name, email, color, emailVerified, profilePicture
  const userData = await getUserInfo();
  console.log('CLI> user:', userData.name, userData.color, userData.id);
  // save my ID for later
  const myID = userData.id;

  // board id derived from index parameter (default 0)
  let boardId;

  // Get some data
  const boards = await getBoardsInfo();
  if (boards) {
    console.log('CLI> boards:', boards);
    const aboard = boards[params.board];
    boardId = aboard.id;
    console.log('My board>', boardId);
  }

  // Create a websocket with the auth cookies
  const socket = socketConnection(params.server, cookies);

  // When socket connected
  socket.on('connect', () => {
    console.log('socket> connected');

    const x = parseInt(params.positionx);
    const y = parseInt(params.positiony);
    const stickieText = params.text;

    getInstance()
      .request({
        method: 'post',
        url: '/api/boards/act/' + boardId,
        baseURL: params.server,
        withCredentials: true,
        data: {
          type: 'create',
          appName: 'stickies',
          id: '',
          position: { x: x, y: y },
          optionalData: { value: { text: stickieText, color: '#ffff97' } },
        },
      })
      .then(() => {
        // Wait 1 sec and leave
        setTimeout(() => {
          console.log('CLI> All done');
          // and quit
          process.exit(1);
        }, 1000);
      });
  });
}

// Start the whole thing
start();
