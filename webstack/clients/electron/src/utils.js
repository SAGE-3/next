/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Electron
const electron = require('electron');
const fs = require('fs');

// URL Stuff
const { sanitizeUrl } = require('@braintree/sanitize-url');

// Dialog
const { dialog } = require('electron');

// Node-Fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Prompt  tools
const prompt = require('electron-prompt');

// Store
const bookmarkStore = require('./bookmarkstore');

/**
 * Check to see if the provided url is a SAGE 3 server
 * The server must be running for this to return true
 * @param {string} check_url
 * @returns {Promise<boolean>} true if it is a sage3 server
 */
async function checkServerIsSage(input_url) {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
  let url = sanitizeUrl(input_url);
  console.log(url);
  const fetchUrl = `http://${url}/api/info`;
  console.log(fetchUrl);
  try {
    const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
    const response_json = await response.json();
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1;
    if (response_json.isSage3) {
      return true;
    } else {
      await dialogShowErrorMessage('Error', 'Not a SAGE3 server.');
      return false;
    }
  } catch (e) {
    await dialogShowErrorMessage('Error', 'Not a SAGE3 server.');
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1;
    return false;
  }
}

/**
 * Show an error dialog message to the user.
 * @param {string} title The title of the dialog box
 * @param {string} message The message shown in the dialog window
 * @returns
 */
async function dialogShowErrorMessage(title, message) {
  const options = {
    type: 'error',
    buttons: ['Ok'],
    defaultId: 0,
    title,
    message,
  };
  return dialog.showMessageBox(null, options);
}

/**
 * Show an error dialog message to the user.
 * @param {string} title The title of the prompt box
 * @param {string} label The label of the input box
 * @returns {Promise<boolean | string>} returns false if user cancled or error. String if the user input something
 */
async function dialogUserTextInput(title, label, value) {
  try {
    const input = await prompt({
      title,
      label,
      value,
      inputAttrs: {
        type: 'text',
      },
      type: 'input',
    });
    if (input === '' || input === null) {
      return false;
    } else {
      return input;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 * Utiltiy function to parse command line arguments as number
 *
 * @method     myParseInt
 * @param      {String}    str           the argument
 * @param      {Number}    defaultValue  The default value
 * @return     {Number}    return an numerical value
 */
function myParseInt(str, defaultValue) {
  var int = parseInt(str, 10);
  if (typeof int == 'number') {
    return int;
  }
  return defaultValue;
}

/**
 * Take a Screenshot of the visible part of the window
 */
function takeScreenshot(window) {
  if (window) {
    // Capture the Electron window
    window.capturePage().then(function (img) {
      // convert to JPEG
      const imageData = img.toJPEG(90);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const second = now.getSeconds();
      const dt = `-${year}-${month}-${day}-${hour}-${minute}-${second}`;
      // dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
      const options = {
        title: 'Save current board as a JPEG file',
        defaultPath: electron.app.getPath('downloads') + '/screenshot' + dt + '.jpg',
      };
      // Open the save dialog
      electron.dialog.showSaveDialog(window, options).then((obj) => {
        if (!obj.canceled) {
          // write the file
          fs.writeFile(obj.filePath.toString(), imageData, 'base64', function (err) {
            if (err) throw err;
          });
        }
      });
    });
  }
}

/**
 * Gets the windows path to a temporary folder to store data
 *
 * @return {String} the path
 */
function getWindowPath() {
  return join(homedir(), 'AppData');
}

/**
 * Gets the Mac path to a temporary folder to store data (/tmp)
 *
 * @return {String} the path
 */
function getMacPath() {
  return '/tmp';
}

/**
 * Gets the Linux path to a temporary folder to store data
 *
 * @return {String} the path
 */
function getLinuxPath() {
  return join(homedir(), '.config');
}

/**
 * In case the platform is among the known ones (for the potential
 * future os platforms)
 *
 * @return {String} the path
 */
function getFallback() {
  if (platform().startsWith('win')) {
    return getWindowPath();
  }
  return getLinuxPath();
}

/**
 * Creates the path to the file in a platform-independent way
 *
 * @param  {String} file_name the name of the file
 * @return the path to the file
 */
function getAppDataPath(file_name) {
  let appDataPath = '';
  switch (platform()) {
    case 'win32':
      appDataPath = getWindowPath();
      break;
    case 'darwin':
      appDataPath = getMacPath();
      break;
    case 'linux':
      appDataPath = getLinuxPath();
      break;
    default:
      appDataPath = getFallback();
  }
  if (file_name === undefined) {
    return appDataPath;
  } else {
    return join(appDataPath, file_name);
  }
}

/**
 * Update the landing page with the latest information
 * @param  {Electron.BrowserWindow} the electron browser window containing the landing page
 */
function updateLandingPage(window) {
  const bookmarks = bookmarkStore.getBookmarks();
  window.webContents.send('store-interface', { response: 'bookmarks-list', bookmarks });
}

module.exports = {
  checkServerIsSage,
  dialogShowErrorMessage,
  dialogUserTextInput,
  myParseInt,
  takeScreenshot,
  getAppDataPath,
  updateLandingPage,
};
