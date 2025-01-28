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
  .option('-n, --no-secure', 'do not use secure connection')
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

const colors = ['green', 'blue', 'gray', 'orange', 'purple', 'yellow', 'red', 'cyan', 'teal', 'pink'];

var FPS = params.rate;
var updateRate = 1000 / FPS;
// Default size of the board
const totalWidth = 3000;
const totalHeight = 3000;

/**
 * Delays the execution for a specified number of seconds.
 *
 * @param {number} sec - The number of seconds to delay.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
async function delay(sec) {
  await new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

class UserBehavior {
  /**
   * Creates an instance of the PointerSecure class.
   *
   * @constructor
   */
  constructor(boardId, roomId) {
    this.myID = '';
    // Random position within a safe margin
    this.px = randomNumber(1500000, 1501000);
    this.py = randomNumber(1500000, 1501000);
    this.incx = randomNumber(1, 2) % 2 ? 1 : -1;
    this.incy = randomNumber(1, 2) % 2 ? 1 : -1;
    this.sensitivity = params.sensitivity;
    this.boardId = boardId;
    this.roomId = roomId;
    this.cookies = '';
    this.socket = null;
  }

  async init() {
    // Login through HTTP
    this.cookies = await loginGuestUser((params.secure ? 'https://' : 'http://') + params.server);
    console.log('CLI> Logged in');

    // Build a user
    const randomName = faker.name.fullName();
    const randomEmail = faker.internet.email();
    const randomAvatar = faker.image.avatar();
    const randomColor = colors[randomNumber(0, colors.length - 1)];
    const userData = {
      name: randomName,
      email: randomEmail,
      color: randomColor,
      profilePicture: randomAvatar,
      userRole: 'user',
      userType: 'client',
    };
    const me = await loginCreateUser((params.secure ? 'https://' : 'http://') + params.server, userData);
    console.log('🚀 ~ UserBehavior ~ init ~ me:', me);
    this.myID = me._id;

    // Get my own info: uid, name, email, color, emailVerified, profilePicture
    // const userData = await getUserInfo();
  }

  boardConnect(socket) {
    boardConnect(socket, this.myID, this.roomId, this.boardId);
  }

  async getInfo() {
    const boardData = await getBoardsInfo();
    console.log('CLI> boards', boardData);
    const roomData = await getRoomsInfo();
    console.log('CLI> rooms', roomData);
  }

  async websocket() {
    // Create a websocket with the auth cookies
    this.socket = socketConnection((params.secure ? 'wss://' : 'ws://') + params.server + '/api', this.cookies);
    return this.socket;
  }

  sendPosition(socket) {
    sendCursor(socket, this.myID, this.px, this.py);
  }

  updatePosition() {
    // step between 0 and 10 pixels
    const movementX = randomNumber(1, 20);
    const movementY = randomNumber(1, 20);
    // scaled up for wall size
    const dx = Math.round(movementX * this.sensitivity);
    const dy = Math.round(movementY * this.sensitivity);
    // detect wall size limits and reverse course
    if (this.px >= totalWidth + 1500000) this.incx *= -1;
    if (this.px <= 1500000) this.incx *= -1;
    if (this.py >= totalHeight + 1500000) this.incy *= -1;
    if (this.py <= 1500000) this.incy *= -1;
    // update global position
    this.px = clamp(this.px + this.incx * dx, 1500000, 1500000 + totalWidth);
    this.py = clamp(this.py + this.incy * dy, 1500000, 1500000 + totalHeight);
  }
}

async function start() {
  // room and board from command arguments
  const boardId = params.board;
  const roomId = params.room;
  console.log('Using room / board', roomId, boardId);

  // Create a user
  const aUser = new UserBehavior(boardId, roomId);
  await aUser.init();
  await aUser.getInfo();
  const socket = await aUser.websocket();

  // When socket connected
  socket.on('open', () => {
    console.log('socket> connected');

    // Connect to a specific board
    aUser.boardConnect(socket);

    // intial position
    aUser.sendPosition(socket);

    // Set a limit on runtime
    setTimeout(() => {
      console.log('CLI> finished');
      // Leave the board
      boardDisconnect(socket, boardId);
      // and quit
      process.exit(1);
    }, params.timeout * 1000);

    // Send cursor position on repeat
    setInterval(() => {
      aUser.updatePosition();
      // Send message to server
      aUser.sendPosition(socket);
    }, updateRate);
  });
}

// Start the whole thing
start();
