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

let myID;
var FPS = params.rate;
var updateRate = 1000 / FPS;

const colors = ['green', 'blue', 'gray', 'orange', 'purple', 'yellow', 'red', 'cyan', 'teal', 'pink'];

async function start() {
  // Login through HTTP
  const cookies = await loginGuestUser('http://' + params.server);
  console.log('CLI> Logged in');

  // Build a user
  const randomName = faker.name.fullName();
  const randomEmail = faker.internet.email();
  const randomAvatar = faker.image.avatar();
  const userData = {
    name: randomName,
    email: randomEmail,
    color: colors[randomNumber(0, colors.length - 1)],
    profilePicture: randomAvatar,
    userRole: 'user',
    userType: 'client',
  };

  const me = await loginCreateUser('http://' + params.server, userData);
  console.log('CLI> Logged in', me);
}

// Start the whole thing
start();
