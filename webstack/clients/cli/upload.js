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

/*
Options:
  -V, --version        output the version number
  -b, --board <s>      board id (string))
  -s, --server <s>     Server URL (string) (default: "https://minim1.evl.uic.edu")
  -o, --open           Open after upload
  -x, --positionx <n>  Position X (number) (default: 0)
  -y, --positiony <n>  Position Y (number) (default: 0)
  -f, --file <s>       File to upload (path)
  -h, --help           display help for command


Upload an image:
node upload.js -b 'xxxxx-xxx' -x 800 -y 800 -f ~/cat.jpg
Upload and open a pdf:
node upload.js -b 'xxxxx-xxx' -x 800 -y 800 -f ~/paper.pdf -o -a pdfViewer
*/

/**
 * Node Modules
 */
import * as fsModule from 'fs';
// Declare fs with Promises
const fs = fsModule.promises;
import { v4 } from 'uuid';

// parsing command-line arguments
import * as commander from 'commander';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// WS protocol
import { socketConnectionJWT } from './src/socket_routes.js';
import { loginJWT, loadToken, uploadFile } from './src/jwt_routes.js';
// Some utitlity functions
import { randomNumber, clamp } from './src/utils.js';

import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .requiredOption('-b, --board <s>', 'board id (string))')
  .requiredOption('-r, --room <s>', 'room id (string))')
  .option('-s, --server <s>', 'Server URL (string)', 'localhost:3333')
  .option('-o, --open', 'Open after upload')
  .option('-x, --positionx <n>', 'Position X (number)', 0)
  .option('-y, --positiony <n>', 'Position Y (number)', 0)
  .option('-f, --file <s>', 'File to upload (path)');

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

async function start() {
  // Test login through HTTP and set token to the axios instance
  const token = loadToken('token.json');
  console.log('JWT> got token');

  const me = await loginJWT('http://' + params.server, token);
  console.log('CLI> user', me.user);
  const myID = me.user.id;

  // board name from command argument (or board0)
  const boardId = params.board;
  const roomId = params.room;

  // Create a websocket with the auth cookies
  const socket = socketConnectionJWT('ws://' + params.server + '/api', token);

  // When socket connected
  socket.on('open', async () => {
    console.log('socket> connected');

    const x = parseInt(params.positionx);
    const y = parseInt(params.positiony);
    const filePath = params.file;

    if (filePath) {
      console.log('Got file', filePath);
      const resp = await uploadFile(filePath, x, y, roomId);
      const asset = resp[0];
      console.log('CLI> upload', asset.id);
      let px = randomNumber(1500000, 1501000);
      let py = randomNumber(1500000, 1501000);
      openImage(socket, roomId, boardId, asset.originalname, asset.id, px, py);
      px = randomNumber(1500000, 1501000);
      py = randomNumber(1500000, 1501000);
      openImage(socket, roomId, boardId, asset.originalname, asset.id, px, py);
    }
  });
}

// Start the whole thing
start();

function openImage(socket, roomId, boardId, title, assetid, x, y) {
  console.log('CLI> open image', roomId, boardId);
  const body = {
    boardId: boardId,
    dragging: false,
    position: { x: x, y: y, z: 0 },
    raised: true,
    roomId: roomId,
    rotation: { x: 0, y: 0, z: 0 },
    size: { width: 600, height: 420, depth: 0 },
    state: { assetid: assetid },
    title: title,
    type: 'ImageViewer',
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
