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
import { v4 } from 'uuid';

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

// Define the StateMachine class
// 1.	State: The current state of the machine (this.state).
// 2.	Transitions: A configuration object where keys are states, and values are possible events and their resulting states.
// 3.	Transition Method: A function (transition(event)) to handle state transitions.

class StateMachine {
  constructor(config) {
    // Initialize the state machine with the initial state and transitions from the config
    this.state = config.initialState;
    this.transitions = config.transitions;
    this.callbacks = config.callbacks || {};
  }

  // Method to handle state transitions based on events
  transition(event) {
    const currentState = this.state;
    const stateTransition = this.transitions[currentState]?.[event];

    if (stateTransition) {
      // console.log(`FSM> Transitioning from "${currentState}" to "${stateTransition}" on event "${event}"`);

      // Call the "onExit" callback for the current state, if defined
      if (this.callbacks.onExit) {
        this.callbacks.onExit(currentState, event);
      }

      // Update the state to the new state
      this.state = stateTransition;

      // Call the "onEnter" callback for the new state, if defined
      if (this.callbacks.onEnter) {
        this.callbacks.onEnter(stateTransition, event);
      }
    } else {
      console.log(`FSM> Invalid transition from "${currentState}" on event "${event}"`);
    }
  }
}

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

    let movingInterval = null;

    // Define the FSM (Finite State Machine) configuration
    this.fsm = new StateMachine({
      initialState: 'off',
      // Transitions: A configuration object where keys are states, and values are possible events and their resulting states.
      transitions: {
        off: { initialize: 'init' },
        init: { move: 'moving' },

        moving: { pause: 'paused', createApp: 'creating', upload: 'uploading', done: 'dead' },
        paused: { wakeUp: 'moving', createApp: 'creating', upload: 'uploading', done: 'dead' },

        creating: { finish: 'moving' },
        uploading: { finish: 'moving' },
      },
      callbacks: {
        // Callback function to be called when entering a new state
        onEnter: (newState, event) => {
          // console.log(`FSM> Entered state: "${newState}" on event: "${event}"`);

          if (newState === 'moving') {
            // Random behavior
            const delayPause = randomNumber(1, 5);
            setTimeout(() => {
              this.fsm.transition('pause');
            }, delayPause * 1000);

            // Send cursor position on repeat
            movingInterval = setInterval(() => {
              this.updatePosition();
              // Send message to server
              this.sendPosition();
            }, updateRate);
          } else if (newState === 'paused') {
            const chance = randomNumber(1, 4);
            console.log('🚀 ~ UserBehavior ~ constructor ~ chance:', chance);
            if (chance === 2) {
              console.log('CLI> Waking up');
              this.fsm.transition('createApp');
            } else {
              const delayTime = randomNumber(1, 3);
              setTimeout(() => {
                this.fsm.transition('wakeUp');
              }, delayTime * 1000);
            }
          } else if (newState === 'creating') {
            console.log('CLI> Creating app');
            this.createApp();
            this.fsm.transition('finish');
          } else if (newState === 'dead') {
            // Leave the board
            console.log('CLI> Leaving board');
            boardDisconnect(this.socket, this.boardId);
          }
        },
        // Callback function to be called when exiting a state
        onExit: (oldState, event) => {
          // console.log(`FSM> Exiting state: "${oldState}" on event: "${event}"`);

          if (oldState === 'moving') {
            // Stop sending cursor position
            clearInterval(movingInterval);
          }
        },
      },
    });
  }

  async init() {
    // Login through HTTP
    this.cookies = await loginGuestUser((params.secure ? 'https://' : 'http://') + params.server);
    console.log('CLI> Logged in');

    // Build a user
    const randomName = faker.person.fullName();
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
    this.myID = me._id;

    // Switch to initial state
    this.fsm.transition('initialize');
  }

  boardConnect() {
    boardConnect(this.socket, this.myID, this.roomId, this.boardId);

    // Start moving
    this.fsm.transition('move');
  }

  async getInfo() {
    const boardData = await getBoardsInfo();
    console.log('CLI> boards', boardData.length);
    const roomData = await getRoomsInfo();
    console.log('CLI> rooms', roomData.length);
  }

  async websocket() {
    // Create a websocket with the auth cookies
    this.socket = socketConnection((params.secure ? 'wss://' : 'ws://') + params.server + '/api', this.cookies);
    return this.socket;
  }

  sendPosition() {
    sendCursor(this.socket, this.myID, this.px, this.py);
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

  createApp() {
    createStickie(this.socket, this.roomId, this.boardId, faker.person.fullName(), this.px, this.py);
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
    aUser.boardConnect();

    // intial position
    aUser.sendPosition();

    // Set a limit on runtime
    setTimeout(() => {
      console.log('CLI> finished');
      aUser.fsm.transition('done');
      // and quit
      process.exit(1);
    }, params.timeout * 1000);
  });
}

// Start the whole thing
start();
