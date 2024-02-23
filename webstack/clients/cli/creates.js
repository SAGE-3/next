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
import { loginJWT, loadToken, getBoards, getRooms, createRoom, createBoard, uploadFile } from './src/jwt_routes.js';
import { socketConnectionJWT } from './src/socket_routes.js';

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
  .option('-f, --file <s>', 'File to upload (path)')
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

async function start() {
  // Test login through HTTP and set token to the axios instance
  const token = loadToken('token.json');
  console.log('JWT> got token');

  const me = await loginJWT('http://' + params.server, token);
  console.log('CLI> user', me.user);
  myID = me.user.id;

  // Create a websocket with the auth cookies
  const socket = socketConnectionJWT('ws://' + params.server + '/api', token);

  const filePath = params.file;

  // When socket connected
  socket.on('open', async () => {
    console.log('socket> connected');

    const boardData = await getBoards();
    console.log('CLI> boards', boardData.length, boardData[0]);
    const roomData = await getRooms();
    console.log('CLI> rooms', roomData.length, roomData[0]);

    let roomcount = 0;
    while (roomcount < 40) {
      let nr = await createRoom({
        name: 'newroom' + roomcount,
        description: 'newroom',
        color: 'red',
        ownerId: myID,
        isPrivate: false,
        privatePin: '',
        isListed: true,
      });
      console.log('CLI> room', nr[0]);
      roomcount++;
      let roomId = nr[0]._id;

      var asset;
      for (let i = 0; i < 25; i++) {
        const resp = await uploadFile(filePath, roomId);
        asset = resp[0];
        console.log('CLI> upload', asset.id);
      }

      let boardcount = 0;
      while (boardcount < 5) {
        let nb = await createBoard({
          name: 'newboard' + boardcount,
          description: 'newboard',
          color: 'red',
          roomId: nr[0]._id,
          ownerId: myID,
          isPrivate: false,
          privatePin: '',
        });
        console.log('CLI> board', nb[0]);
        boardcount++;
        let boardId = nb[0]._id;

        let stickiecount = 0;
        let px, py;
        const maxstickies = randomNumber(1, 5);
        while (stickiecount < maxstickies) {
          px = randomNumber(1500000, 1501000);
          py = randomNumber(1500000, 1501000);
          createStickie(socket, roomId, boardId, faker.name.fullName(), px, py);
          stickiecount++;
        }

        px = randomNumber(1500000, 1501000);
        py = randomNumber(1500000, 1501000);
        openImage(socket, roomId, boardId, asset.originalname, asset.id, px, py);
        px = randomNumber(1500000, 1501000);
        py = randomNumber(1500000, 1501000);
        openImage(socket, roomId, boardId, asset.originalname, asset.id, px, py);
      }
    }
  });
}

// Start the whole thing
start();
