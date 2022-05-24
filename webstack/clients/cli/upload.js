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
node upload.js -b 'xxxxx-xxx' -x 800 -y 800 -f ~/paper.jpg -o -a pdfViewer
*/

/**
 * Node Modules
 */
import * as fsModule from 'fs';
// Declare fs with Promises
const fs = fsModule.promises;

// parsing command-line arguments
import * as commander from 'commander';
// Prepare a form data structure for upload
import FormData from 'form-data';

// Get the version from the package file
const pkg = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url)));
const version = pkg.version;

// HTTP protocol
import { getInstance, loginGuestUser, getUserInfo } from './src/http_routes.js';
// WS protocol
import { socketConnection } from './src/socket_routes.js';

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version(version)
  .requiredOption('-b, --board <s>', 'board id (string))')
  .option('-a, --app <s>', 'application to open', 'imageViewer')
  .option('-s, --server <s>', 'Server URL (string)', 'https://minim1.evl.uic.edu')
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
    const filePath = params.file;

    var bodyFormData = new FormData();
    bodyFormData.append('files', fsModule.createReadStream(filePath));
    bodyFormData.append('targetX', x);
    bodyFormData.append('targetY', y);
    bodyFormData.append('boardId', boardId);
    // If specified, will open
    if (params.open) {
      bodyFormData.append('appName', params.app);
    }

    if (filePath) {
      getInstance()
        .request({
          method: 'post',
          url: '/api/boards/upload',
          withCredentials: true,
          // add the right headers for the form
          headers: {
            ...bodyFormData.getHeaders(),
          },
          // the form
          data: bodyFormData,
        })
        .then((resp) => {
          console.log('Resp>', resp.status, resp.statusText, resp.data);
          // Wait 1 sec and leave
          setTimeout(() => {
            console.log('CLI> All done');
            // and quit
            process.exit(1);
          }, 1000);
        });
    }
  });
}

// Start the whole thing
start();
