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
// Prepare a form data structure from login
import FormData from 'form-data';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// HTTP protocol
import { loginGuestUser, getUserInfo, getBoardsInfo, createBoard } from './src/http_routes.js';
// WS protocol
import { socketConnection } from './src/socket_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .option('-s, --server <s>', 'Server URL (string)', 'http://localhost:3333')
  .option('-t, --timeout <n>', 'runtime in sec (number)', 10);

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
  // const userData = await getUserInfo();
  // console.log('CLI> user:', userData.name, userData.color, userData.id);
  // // save my ID for later
  // const myID = userData.id;

  // const boardData = await getBoardsInfo();
  // console.log('CLI> boards', boardData);

  // // Create a websocket with the auth cookies
  // const socket = socketConnection(params.server, cookies);

  // // When socket connected
  // socket.on('connect', () => {
  //   console.log('socket> connected');

  //   let w = 300;
  //   let h = 400;
  //   for (let index = 0; index < 100; index++) {
  //     createBoard({ name: 'newboard' + index, width: w, height: h, scaleBy: 1 });
  //     w += 30;
  //     h += 20;
  //   }

  //   // Set a limit on runtime
  //   setTimeout(() => {
  //     console.log('CLI> done');
  //     // and quit
  //     process.exit(1);
  //   }, params.timeout * 1000);

  //   socket.on('boards-update', (updates) => {
  //     console.log('Updates> state', updates);
  //     console.log('-----------------');
  //   });
  // });
}

// Start the whole thing
start();
