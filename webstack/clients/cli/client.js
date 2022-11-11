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

// HTTP protocol
import { getInstance, loginGuestUser, loginCreateUser, getUserInfo, setUserColor, setUserName } from './src/http_routes.js';
// WS protocol
import { socketConnection, boardConnect, boardDisconnect, sendCursor, presenceUpdate } from './src/socket_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .option('-s, --server <s>', 'Server URL (string)', 'localhost:3333')
  .option('-r, --route <r>', 'Route (string)', '/api/data-dump');

// Routes:
// /api/
// /api/boards/
// /api/data-dump
// /api/content/assets
// /api/user/info
// http://localhost:3333/api/boards/

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

async function start() {
  // Login through HTTP
  const cookies = await loginGuestUser('http://' + params.server);
  console.log('CLI> Logged in');

  const me = await loginCreateUser('http://' + params.server);
  // save my ID for later
  const myID = me._id;

  // Get my own info: uid, name, email, color, emailVerified, profilePicture
  const userData = await getUserInfo(myID);
  console.log('CLI> user:', userData);

  // Change name and color of pointer
  await setUserColor(myID, '#B794F4');
  await setUserName(myID, 'qwerty');

  // console.log('CLI> route', params.route);

  // Create a websocket with the auth cookies
  const socket = socketConnection('ws://' + params.server + '/api', cookies);

  // // Send the route request
  // axiosInstance
  //   .request({
  //     method: 'get',
  //     url: params.route,
  //     responseType: 'json',
  //   })
  //   .then(function (response) {
  //     // handle success
  //     console.log('CLI> succes', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
  //     if (response.data) {
  //       console.log('CLI> ', response.data);
  //     }
  //   })
  //   .catch(function (e) {
  //     // handle error
  //     console.log('Error>', params.route);
  //   })
  //   .then(() => {
  //     // Wait 1 sec and leave
  //     setTimeout(() => {
  //       console.log('CLI> All done');
  //       // and quit
  //       process.exit(1);
  //     }, 1000);
  //   });
}

// Start the whole thing
start();
