/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * @server JWT cli function.
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
import { loginJWT, loadToken } from './src/jwt_routes.js';
import { getInstance } from './src/http_routes.js';
// WS protocol
import { socketConnectionJWT, boardConnect, boardDisconnect, presenceUpdate } from './src/socket_routes.js';
import { getBoards, moveApp, resizeApp, boardAct } from './src/jwt_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .requiredOption('-a, --app <s>', 'application id (string))')
  .option('-s, --server <s>', 'Server URL (string)', 'http://localhost:3333')
  .option('-b, --board <n>', 'board index (int))', 0)
  .option('-f, --file <s>', 'json token file (string))', 'token.json')
  .option('-t, --timeout <n>', 'runtime in sec (number)', 100);

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

async function start() {
  // Test login through HTTP and set token to the axios instance
  const token = loadToken(params.file);
  console.log('JWT> got token');

  await loginJWT(params.server, token);
  console.log('CLI> Logged in');

  // board id derived from index parameter (default 0)
  let boardId;

  // Get some data
  const data = await getBoards();
  if (data) {
    console.log('CLI> boards:', data);
    const aboard = data[params.board];
    boardId = aboard.id;
    console.log('My board>', boardId);
  }

  // Create a websocket with the auth cookies
  const socket = socketConnectionJWT(params.server, token);

  // When socket connected
  socket.on('connect', () => {
    console.log('socket> connected');

    // Connect to a specific board
    boardConnect(socket, boardId);

    // Set a limit on runtime
    setTimeout(() => {
      console.log('CLI> done');
      // Leave the board
      boardDisconnect(socket, boardId);
      // and quit
      process.exit(1);
    }, params.timeout * 1000);

    socket.on('boards-update', (updates) => {
      console.log('Boards> update', updates);
      console.log('-----------------');
    });

    // All the updates
    socket.on('data', async (msg) => {
      // console.log('message>', msg);
      if (Object.keys(msg.updates.apps).length === 0 && Object.keys(msg.updates.data).length === 0) {
        // initial message with all existing apps
        console.log('All Apps');
        let apps = msg.state.apps;
        for (const appid in apps) {
          const app = apps[appid];
          console.log('App> id', app.id);
          console.log('       name', app.appName);
          const { x, y, width, height } = app.position;
          console.log('       pos', x.toFixed(0) + 'x' + y.toFixed(0), 'size', width.toFixed(0) + 'x' + height.toFixed(0));
        }
        console.log('-----------------');
      }

      // Go over the app updates
      for (const appid in msg.updates.apps) {
        const hasupdate = msg.updates.apps[appid];
        if (hasupdate) {
          const app = msg.state.apps[appid];
          if (app) {
            console.log('App> new/move/resize', appid);
            console.log('       name', app.appName);
            const { x, y, width, height } = app.position;
            console.log('       pos', x.toFixed(0) + 'x' + y.toFixed(0), 'size', width.toFixed(0) + 'x' + height.toFixed(0));
          } else {
            // if app not in collection, it was deleted
            console.log('App> delete', appid);
          }
        }
      }
    });

    setTimeout(() => {
      // moveApp(boardId, params.app, 200, 200);
      // resizeApp(boardId, params.app, 500, 500, 1500, 1500);
      // closeApp(boardId, params.app);
      boardAct(boardId, {
        type: 'dispatch-action',
        reference: params.app,
        action: {
          type: 'update',
          text: '42',
          color: '#ffff97',
        },
      });

      console.log('Done');
    }, 1000);
  });
}

// Start the whole thing
start();
