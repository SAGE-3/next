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
import { axiosInstance, loginGuestUser, getUserInfo, setUserColor, setUserName } from './src/http_routes.js';
// WS protocol
import { socketConnection, boardConnect, boardDisconnect, sendCursor, presenceUpdate } from './src/socket_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .option('-b, --board <s>', 'board id (string))', 'board0')
  .option('-s, --server <s>', 'Server URL (string)', 'http://localhost:3333')
  .option('-x, --positionx <n>', 'Position X (number)', 0)
  .option('-y, --positiony <n>', 'Position Y (number)', 0)
  .option('-u, --url <s>', 'URL (string)', 'https://bing.com/');

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

  // board name from command argument (or board0)
  const boardId = params.board;

  // Create a websocket with the auth cookies
  const socket = socketConnection(params.server, cookies);

  // When socket connected
  socket.on('connect', () => {
    console.log('socket> connected');

    const x = parseInt(params.positionx);
    const y = parseInt(params.positiony);
    const webURL = params.url;

    axiosInstance
      .request({
        method: 'post',
        url: '/api/boards/act/' + boardId,
        withCredentials: true,
        data: {
          type: 'create',
          appName: 'webview',
          id: '',
          position: { x: x, y: y, width: 800, height: 800 },
          optionalData: {
            address: {
              history: [webURL],
              historyIdx: 0,
            },
            visual: {
              zoom: 1.0,
              scrollX: 0,
              scrollY: 0,
            },
          },
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
