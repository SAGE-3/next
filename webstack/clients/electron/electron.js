/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Electron SAGE3 client
 *
 * @class electron
 * @module electron
 * @submodule electron
 */

'use strict';

// Node modules
const path = require('path');
const dns = require('node:dns');

// Get platform and hostname
var os = require('os');

// NPM modules
const electron = require('electron');

// parsing command-line arguments
var program = require('commander');

// URL received from protocol sage3://
var gotoURL = '';

// update system
const updater = require('./src/updater');
// Get the version from the package file
var version = require('./package.json').version;
// First run
var firstRun = true;

// Utilities
const { checkServerIsSage, myParseInt, takeScreenshot, updateLandingPage } = require('./src/utils');

// MenuBuilder
const { buildMenu } = require('./src/menuBuilder');

// Stores
const windowStore = require('./src/windowstore');
const windowState = windowStore.getWindow();
const bookmarkStore = require('./src/bookmarkstore');

// SAGE3 Google maps APIKEY needed for user geo-location service
// Stupid way to hide the key (I know)
process.env.GOOGLE_API_KEY = Buffer.from('QUl6YVN5RGNOWjNCbzY1RmJtUzBOaVJ6WEdaekNjSFJIdm9ncURn', 'base64').toString('ascii');

// Analytics
var { analyticsOnStart, analyticsOnStop, genUserId } = require('./src/analytics');
var analytics_enabled = true;
// random user id
const userId = genUserId();

// handle install/update for Windows
const { handleSquirrelEvent } = require('./src/squirrelEvent');
if (require('electron-squirrel-startup')) {
  return;
}
// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// with Electron version >= 17, sources available in the main process
const desktopCapturer = electron.desktopCapturer;
const shell = electron.shell;
// Module to handle ipc with Browser Window
const ipcMain = electron.ipcMain;

// Restore the network order
dns.setDefaultResultOrder('ipv4first');

/////////////////////////////////////////////////////////////////
// Auto updater
/////////////////////////////////////////////////////////////////
console.log('APP Updater> current version', app.getVersion());
const autoUpdater = electron.autoUpdater;

// autoUpdater.on('error', (error) => {
//   console.log('APP Updater> error', error);
// });
// autoUpdater.on('checking-for-update', (e) => {
//   console.log('APP Updater> checking-for-update', e);
// });
// autoUpdater.on('update-available', (e) => {
//   console.log('APP Updater> update-available', e);
// });
// autoUpdater.on('update-not-available', (e) => {
//   console.log('APP Updater> update-not-available', e);
// });
// autoUpdater.on('before-quit-for-update', (e) => {
//   console.log('APP Updater> before-quit-for-update', e);
// });
// autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
//   const dialogOpts = {
//     type: 'info',
//     buttons: ['Restart', 'Later'],
//     title: 'Application Update',
//     message: process.platform === 'win32' ? releaseNotes : releaseName,
//     detail: 'A new version has been downloaded. Restart the application to apply the updates.',
//   };
//   dialog.showMessageBox(dialogOpts).then((returnValue) => {
//     if (returnValue.response === 0) autoUpdater.quitAndInstall();
//   });
// });
// autoUpdater.setFeedURL({
//   url: 'https://update.electronjs.org/SAGE-3/next/darwin-arm64/client-1.0.0-beta.31',
//   requestHeaders: { 'User-Agent': 'update-electron-app/2.0.1 (darwin: arm64)' },
// });
// autoUpdater.checkForUpdates();

// Auto update
// require('update-electron-app')({ repo: 'SAGE-3/next' });
const { updateElectronApp, UpdateSourceType } = require('update-electron-app');
updateElectronApp({
  updateSource: {
    host: 'https://update.electronjs.org',
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: 'SAGE-3/next',
  },
  updateInterval: '10 minutes',
  logger: require('electron-log'),
});
/////////////////////////////////////////////////////////////////

// Registering a custom protocol sage3://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('sage3', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('sage3');
}

// Store current site informations
var currentDomain;
var currentServer;
var isAtBoard = false;

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
program
  .version(version)
  .option('-d, --display <n>', 'Display client ID number (int)', parseInt, 0)
  .option('-f, --fullscreen', 'Fullscreen (boolean)', windowState.fullscreen)
  .option('-m, --monitor <n>', 'Select a monitor (int)', myParseInt, null)
  .option('-n, --no_decoration', 'Remove window decoration (boolean)', false)
  .option('-s, --server <s>', 'Server URL (string)', windowState.server || 'file://html/landing.html')
  .option('-x, --xorigin <n>', 'Window position x (int)', myParseInt, windowState.x)
  .option('-y, --yorigin <n>', 'Window position y (int)', myParseInt, windowState.y)
  .option('-c, --clear', 'Clear window preferences', false)
  .option('--allowDisplayingInsecure', 'Allow displaying of insecure content (http on https)', true)
  .option('--allowRunningInsecure', 'Allow running insecure content (scripts accessed on http vs https)', true)
  .option('--cache', 'Clear the cache at startup', false)
  .option('--console', 'Open the devtools console', false)
  .option('--debug', 'Open the port debug protocol (port number is 9222 + clientID)', false)
  .option('--experimentalFeatures', 'Enable experimental features', false)
  .option('--height <n>', 'Window height (int)', myParseInt, windowState.height)
  .option('--disable-hardware', 'Disable hardware acceleration', false)
  .option('--show-fps', 'Display the Chrome FPS counter', false)
  .option('--profile <s>', 'Create a profile (string)')
  .option('--width <n>', 'Window width (int)', myParseInt, windowState.width);
// Parse the arguments
program.parse(args);
// Get the results
const commander = program.opts();

if (commander.profile) {
  console.log('Profile>', commander.profile);
  const profilePath = path.resolve(commander.profile);
  app.setPath('userData', profilePath);
  console.log('Profile> userData', profilePath);
}

// Disable hardware rendering (useful for some large display systems)
if (commander.disableHardware) {
  app.disableHardwareAcceleration();
}

if (commander.clear) {
  console.log('Preferences> clear all');
  windowStore.default();
  bookmarkStore.clear();

  // clear the caches, useful to remove password cookies
  const session = electron.session.defaultSession;
  session.clearStorageData({ storages: ['appcache', 'cookies', 'local storage', 'serviceworkers'] }).then(() => {
    console.log('Electron>	Caches cleared');
  });
}

if (process.platform === 'win32') {
  // Force using integrated GPU when there are multiple GPUs available
  // console.log('Preferences> force integrated GPU (windows)');
  // app.commandLine.appendSwitch('force_low_power_gpu');
}

// Reset the desktop scaling on Windows
// if (process.platform === 'win32') {
//   app.commandLine.appendSwitch('force-device-scale-factor', '1');
// }

// Get media permissions
// if (process.platform === 'darwin') {
//   // mediaType = microphone camera screen
//   const micAccess = electron.systemPreferences.getMediaAccessStatus('microphone');
//   console.log('Mic access', micAccess);
//   const camAccess = electron.systemPreferences.getMediaAccessStatus('camera');
//   console.log('Cam access', camAccess);
//   const screenAccess = electron.systemPreferences.getMediaAccessStatus('screen');
//   console.log('Screen access', screenAccess);
// }

// As of 2019, video elements with sound will no longer autoplay unless user interacted with page.
// switch found from: https://github.com/electron/electron/issues/13525/
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Random crashes on various websites that will causes the whole electron app to crash
// This fix is from here: https://github.com/electron/electron/issues/25469
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

if (commander.server) {
  // Remove the limit on the number of connections per domain
  //  the usual value is around 6
  var parsedURL = new URL(commander.server);
  // default domains are local
  var domains = 'localhost,127.0.0.1';
  // Store current site domain
  currentDomain = parsedURL.hostname;
  if (parsedURL.hostname) {
    // add the hostname
    domains += ',' + parsedURL.hostname;
  }
  app.commandLine.appendSwitch('ignore-connections-limit', domains);
}

// For display clients, ignore certificate errors
app.commandLine.appendSwitch('ignore-certificate-errors');

// Enable the Chrome builtin FPS display for debug
if (commander.showFps) {
  app.commandLine.appendSwitch('show-fps-counter');
}

// Enable port for Chrome DevTools Protocol to control low-level
// features of the browser. See:
// https://chromedevtools.github.io/devtools-protocol/
if (commander.debug) {
  // Common port for this protocol
  let port = 9222;
  // Offset the port by the client number, so every client gets a different one
  port += commander.display;
  // Add the parameter to the list of options on the command line
  app.commandLine.appendSwitch('remote-debugging-port', port.toString());
}

// Information for the 'about' panel in the app
app.setAboutPanelOptions({
  applicationName: 'SAGE3',
  applicationVersion: version,
  copyright: 'Copyright © 2023 Project SAGE3',
  website: 'https://www.sage3.app/',
});

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 */
var mainWindow;

function showHidingWindow() {
  const res = electron.dialog.showMessageBoxSync(mainWindow, {
    title: 'Notification from SAGE3',
    message: 'Do you want to hide the SAGE3 window ?',
    detail: 'SAGE3 will keep running in the menu bar during screen sharing.',
    type: 'question',
    defaultId: 0,
    cancelId: 1,
    // icon: path.join(__dirname, 'images/s3.png'),
    buttons: ['OK', 'Cancel'],
  });
  if (!res) {
    // Hide the window
    mainWindow.blur();
  }
}

/**
 * Opens a window.
 *
 * @method     openWindow
 */
function openWindow() {
  mainWindow.show();

  // if server is specified, used the URL
  if (commander.server) {
    // Start to build a URL to load
    var location = commander.server;
    currentServer = location;

    if (gotoURL) mainWindow.loadURL(gotoURL);
    else mainWindow.loadURL(location);

    if (commander.monitor !== null) {
      mainWindow.on('show', function () {
        mainWindow.setFullScreen(true);
        mainWindow.setMenuBarVisibility(false);
        // Once all done, prevent changing the fullscreen state
        mainWindow.fullScreenable = false;
      });
    } else {
      // Once all done, prevent changing the fullscreen state
      mainWindow.fullScreenable = false;
    }
  }
}

/**
 * Disable geolocation because of Electron v13 bug
 * @param {any} session
 */
function disableGeolocation(session) {
  if (process.platform === 'darwin') {
    session.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'geolocation') {
        // Denied
        return callback(false);
      }
      callback(true);
    });
    session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      if (permission === 'geolocation') {
        // Denied
        return false;
      }
      return true;
    });
  }
}

function enableGeolocation(session) {
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Electron>	req', permission);
    if (permission === 'geolocation') {
      return callback(true);
    }
    callback(true);
  });
  session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    console.log('Electron>	check', permission);
    if (permission === 'geolocation') {
      return true;
    }
    return true;
  });
}

// Size and position of the window
let state = {};
const defaultSize = {
  frame: !commander.no_decoration,
  fullscreen: commander.fullscreen,
  x: commander.xorigin,
  y: commander.yorigin,
  width: commander.width,
  height: commander.height,
};

// Function to save the state in the data store
const saveState = async () => {
  if (!mainWindow.isMinimized()) {
    Object.assign(state, getCurrentPosition());
  }
  state.fullscreen = mainWindow.isFullScreen();

  // Save the board URL in a format that can be used to re-enter the board
  var boardURL = mainWindow.webContents.getURL();
  boardURL = boardURL.replace('/board/', '/enter/');
  state.server = boardURL;

  // Save the state
  windowStore.setWindow(state);

  if (commander.clear) {
    console.log('Preferences> clear all');
    windowStore.default();
    bookmarkStore.clear();

    // clear the caches, useful to remove password cookies
    const session = electron.session.defaultSession;
    session.clearStorageData({ storages: ['appcache', 'cookies', 'local storage', 'serviceworkers'] }).then(() => {
      console.log('Electron>	Caches cleared');
    });
  }
};

// Function to get values back from the store
const restore = () => windowStore.getWindow();
// Function to get the current position and size
const getCurrentPosition = () => {
  const position = mainWindow.getPosition();
  const size = mainWindow.getSize();
  return {
    x: position[0],
    y: position[1],
    width: size[0],
    height: size[1],
  };
};

// Function to check if window is within some bounds
const windowWithinBounds = (windowState, bounds) => {
  return (
    windowState.x >= bounds.x &&
    windowState.y >= bounds.y &&
    windowState.x + windowState.width <= bounds.x + bounds.width &&
    windowState.y + windowState.height <= bounds.y + bounds.height
  );
};

// Function to return default values: center of primary screen
const resetToDefaults = () => {
  const bounds = electron.screen.getPrimaryDisplay().bounds;
  return Object.assign({}, defaultSize, {
    x: (bounds.width - defaultSize.width) / 2,
    y: (bounds.height - defaultSize.height) / 2,
  });
};

/**
 * Creates an electron window.
 *
 * @method     createWindow
 */
function createWindow() {
  // Create option data structure
  var options = {
    width: commander.width,
    height: commander.height,
    frame: !commander.no_decoration,
    fullscreen: commander.fullscreen,
    show: !commander.fullscreen,
    // autoHideMenuBar: true,
    fullscreenable: commander.fullscreen,
    alwaysOnTop: commander.fullscreen,
    // kiosk: commander.fullscreen,
    // a default color while loading
    backgroundColor: '#565656',
    // resizable: !commander.fullscreen,
    webPreferences: {
      nativeWindowOpen: true,
      // Enable webviews
      webviewTag: true,
      // Disable alert and confirm dialogs
      disableDialogs: true,
      // nodeIntegration: true,
      // contextIsolation: false,
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
      allowDisplayingInsecureContent: commander.allowDisplayingInsecure,
      allowRunningInsecureContent: commander.allowRunningInsecure,
      // this enables things like the CSS grid. add a commander option up top for enable / disable on start.
      experimentalFeatures: commander.experimentalFeatures ? true : false,
      // Hack to preload some js
      preload: path.resolve(path.join(__dirname, 'preload.js')),
    },
  };

  // Function to calculate if window is visible
  const ensureVisibleOnSomeDisplay = (windowState) => {
    const visible = electron.screen.getAllDisplays().some((display) => {
      return windowWithinBounds(windowState, display.bounds);
    });
    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return resetToDefaults();
    }
    return windowState;
  };

  // Restore the state
  state = ensureVisibleOnSomeDisplay(restore());

  // Deny geolocation on Mac, it causes a crash in Electron v13
  // const session = electron.session.defaultSession;
  // disableGeolocation(session);
  // enableGeolocation(session);

  // Screen recording self: true means desktop capture wont show SAGE3 client
  // mainWindow.setContentProtection(true);

  // If a monitor is specified
  if (commander.monitor !== null) {
    // get all the display data
    let displays = electron.screen.getAllDisplays();
    // get the bounds of the interesting one
    let bounds = displays[commander.monitor].bounds;
    // overwrite the values specified
    options.width = bounds.width;
    options.height = bounds.height;
    options.x = bounds.x;
    options.y = bounds.y;
    options.no_decoration = true;
  }

  // Create the browser window with state and options mixed in
  mainWindow = new BrowserWindow({ ...state, ...options });

  // Build a menu
  buildMenu(mainWindow, commander);

  // Analytics on start
  if (!commander.server.includes('localhost') && analytics_enabled) {
    analyticsOnStart(userId, state.server);
  } else {
    analytics_enabled = false;
  }

  if (commander.cache) {
    // clear the caches, useful to remove password cookies
    const session = electron.session.defaultSession;
    session
      .clearStorageData({
        storages: ['appcache', 'cookies', 'local storage', 'serviceworkers'],
      })
      .then(() => {
        console.log('Electron>	Caches cleared');
        openWindow();
      });
  } else {
    openWindow();
  }

  // When the webview tries to download something
  electron.session.defaultSession.on('will-download', (event, item, webContents) => {
    // Commenting out the restrictions for now
    // const aURL = new URL(item.getURL());
    // const hostname = aURL.hostname;
    // // Allow downloads from the local server or generated data
    // if (hostname !== currentDomain && aURL.protocol !== 'data:') {
    //   // do nothing
    //   event.preventDefault();
    //   // send message to the render process (browser)
    //   mainWindow.webContents.send('warning', 'File download restricted server addresses');
    // }

    // Monitor asset downloads

    // item.on('updated', (evt, state) => {
    //   if (state === 'interrupted') {
    //     console.log('Download is interrupted but can be resumed');
    //   } else if (state === 'progressing') {
    //     if (item.isPaused()) {
    //       console.log('Download is paused');
    //     } else {
    //       console.log(`Received bytes: ${item.getReceivedBytes()}`);
    //     }
    //   }
    // });

    item.once('done', (evt, state) => {
      if (state === 'completed') {
        // Send a message to the renderer process to show a notification
        mainWindow.webContents.send('download', {
          filename: item.getFilename(),
          bytes: item.getTotalBytes(),
          completed: true,
        });
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });

  ipcMain.on('store-interface', (event, args) => {
    const request = args.request;
    switch (request) {
      case 'redirect':
        const url = args.url;
        if (!checkServerIsSage(url)) return;
        mainWindow.loadURL(url);
        break;
      case 'get-list':
        updateLandingPage(mainWindow);
        break;
    }
  });

  // Mute the audio (just in case)
  // var playAudio = commander.audio || commander.display === 0;
  // mainWindow.webContents.audioMuted = !playAudio;

  // Open the DevTools.
  if (commander.console) {
    mainWindow.webContents.openDevTools();
  }

  // mainWindow.on('close', saveState);
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object
    mainWindow = null;
  });

  // show/hide menubar when going fullscreen
  mainWindow.on('enter-full-screen', function () {
    mainWindow.setMenuBarVisibility(false);
  });
  mainWindow.on('leave-full-screen', function () {
    mainWindow.setMenuBarVisibility(true);
  });
  // mainWindow.on('blur', function () {
  //   console.log('Electron>	Window blurred');
  // });
  // mainWindow.on('focus', function () {
  //   console.log('Electron>	Window show');
  // });

  // when the display client is loaded
  mainWindow.webContents.on('did-finish-load', function () {
    if (mainWindow.isFullScreen()) {
      mainWindow.setMenuBarVisibility(false);
    }

    // Check for updates
    if (firstRun) {
      const currentURL = mainWindow.webContents.getURL();
      const parsedURL = new URL(currentURL);
      // updater.checkForUpdates(parsedURL.origin, false);
      firstRun = false;
    }
  });

  mainWindow.webContents.on('did-stop-loading', function () {
    let aURL = mainWindow.webContents.getURL();
    // Need to use did-stop-loading, react router does not trigger
    //   did-finish-load or will-navigate
    if (aURL.includes(currentDomain) && aURL.includes('/board/board')) {
      isAtBoard = true;
    } else {
      isAtBoard = false;
    }
  });

  // If the window opens before the server is ready,
  // wait 1 sec. and try again 4 times
  // Finally, redirect to the main server
  mainWindow.webContents.on('did-fail-load', function (ev, code, desc, vurl) {
    if (code === -27) {
      // -27 ERR_BLOCKED_BY_RESPONSE
      // ignore it
      console.log('Electron> warning: failed to load', code, desc, vurl);
    } else {
      mainWindow.loadFile('./html/landing.html');
    }
  });

  mainWindow.webContents.on('will-navigate', function (ev, destinationUrl) {
    const aURL = new URL(destinationUrl);
    const destinationHostname = aURL.hostname;

    // Prevent client from leaving domain through links
    // Can still use the remote server menu
    if (isAtBoard && destinationHostname !== currentDomain) {
      ev.preventDefault();
    }
  });

  // New webview going to be added
  mainWindow.webContents.on('will-attach-webview', function (event, webPreferences, params) {
    console.log('will-attach-webview');
    // Disable alert and confirm dialogs
    webPreferences.disableDialogs = true;

    // webPreferences.contextIsolation = true;
    // webPreferences.nodeIntegration = true;
    // params.nodeIntegration = true;

    ipcMain.on('streamview_stop', (e, args) => {
      // Message for the webview pixel streaming
      const viewContent = electron.webContents.fromId(args.id);
      if (viewContent) viewContent.endFrameSubscription();
    });
    ipcMain.on('streamview', (e, args) => {
      // console.log('Webview>    message', channel, args);
      // console.log('Webview> IPC Message', args.id, args.width, args.height);

      // Message for the webview pixel streaming
      const viewContent = electron.webContents.fromId(args.id);

      viewContent.enableDeviceEmulation({
        screenPosition: 'mobile',
        screenSize: { width: args.width, height: args.height },
      });

      viewContent.beginFrameSubscription(false, (image, dirty) => {
        let dataenc;
        let neww, newh;
        const devicePixelRatio = 2;
        const quality = 60;
        if (devicePixelRatio > 1) {
          neww = dirty.width / devicePixelRatio;
          newh = dirty.height / devicePixelRatio;
          const resizedimage = image.resize({ width: neww, height: newh, quality: 'better' });
          dataenc = resizedimage.toJPEG(quality);
        } else {
          dataenc = image.toJPEG(quality);
          neww = dirty.width;
          newh = dirty.height;
        }
        mainWindow.webContents.send('paint', {
          id: args.id,
          buf: dataenc.toString('base64'),
          dirty: { ...dirty, width: neww, height: newh },
        });
      });
    });

    // Override the UserAgent variable: make websites behave better
    // Not permanent solution: here pretending to be Google Chrome
    // params.useragent =
    //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';
  });

  app.on('web-contents-created', function (webContentsCreatedEvent, contents) {
    if (contents.getType() === 'webview') {
      // OLD API
      // contents.on('new-window', function (newWindowEvent, url) {
      //   console.log('Webview> New window', url);
      //   newWindowEvent.preventDefault();
      // });

      // NEW API
      contents.on('dom-ready', () => {
        // Block creating new windows from webviews
        contents.setWindowOpenHandler((details) => {
          // tell the renderer to create another webview
          mainWindow.webContents.send('open-webview', { url: details.url });
          // do nothing in the main process
          return { action: 'deny' };
        });
      });

      // Block automatic download from webviews (seems to block all downloads)
      // contents.session.on('will-download', (event, item, webContents) => {
      //   event.preventDefault();
      // });
    }
  });

  // Handle the new window event now
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.frameName === 'sage3') {
      shell.openExternal(details.url);
    }
    // Allow to open discord links
    if (details.url.startsWith('https://discord.gg/')) {
      shell.openExternal(details.url);
    }
    return { action: 'deny' };
  });

  // New webview added
  mainWindow.webContents.on('did-attach-webview', function (event, webContents) {
    // disableGeolocation(webContents.session);
  });

  // Block the zoom limits
  // i.e. pinch-to-zoom events now scale the board like a scroll event
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  // Request from the renderer process
  ipcMain.on('asynchronous-message', (event, arg) => {
    if (arg === 'version') event.reply('version', version);
  });

  // Catch remote URL to connect to
  ipcMain.on('connect-url', (e, aURL) => {
    var location = aURL;
    var parsedURL = new URL(aURL);
    // Save the current location in global variable
    currentServer = parsedURL.host;
    // Update current domain
    currentDomain = parsedURL.hostname;

    if (mainWindow) {
      mainWindow.loadURL(location);
    }
  });

  // Retrieve media sources for desktop sharing
  ipcMain.on('request-sources', () => {
    // Get list of the monitors and windows, requesting thumbnails for each.
    // available types are screen and window
    const mediaInfo = {
      types: ['screen', 'window'],
      // types: ['screen'],
      thumbnailSize: { width: 200, height: 200 },
    };

    // Get the sources and return the result to the renderer
    desktopCapturer.getSources(mediaInfo).then((sources) => {
      const values = [];
      for (let s in sources) {
        const source = sources[s];
        const { name, id, thumbnail, display_id } = source;
        // Transform native image to base64
        const thumbnailImage = thumbnail ? thumbnail.toDataURL() : null;
        const value = {
          name,
          id,
          thumbnail: thumbnailImage,
          display_id,
          appIcon: null,
        };
        // Add to the list
        values.push(value);
      }
      // Send the array of sources to the renderer
      mainWindow.webContents.send('set-source', values);
    });
  });

  ipcMain.on('load-landing', () => {
    mainWindow.loadFile('./html/landing.html');
  });

  // Request from the renderer process
  ipcMain.on('hide-main-window', () => {
    showHidingWindow();
  });
  ipcMain.on('show-main-window', () => {
    mainWindow.show();
  });
  ipcMain.on('request-current-display', () => {
    const winBounds = mainWindow.getBounds();
    const whichScreen = electron.screen.getDisplayNearestPoint({ x: winBounds.x, y: winBounds.y });
    mainWindow.webContents.send('current-display', whichScreen.id);
  });

  // Open external links in the default browser
  ipcMain.on('open-external-url', (event, arg) => {
    if (arg && arg.url) shell.openExternal(arg.url);
  });

  // Request for a screenshot from the web client
  ipcMain.on('take-screenshot', () => {
    takeScreenshot(mainWindow);
  });

  // Request from user for Client Info
  ipcMain.on('client-info-request', () => {
    const info = {
      version: version,
    };
    mainWindow.webContents.send('client-info-response', info);
  });

  // Request from Client for bookmarks
  ipcMain.on('get-servers-request', () => {
    const bookmarks = bookmarkStore.getBookmarks();
    mainWindow.webContents.send('get-servers-response', bookmarks);
  });

  // Request from user to check for updates to the client
  ipcMain.on('client-update-check', () => {
    const currentURL = mainWindow.webContents.getURL();
    const parsedURL = new URL(currentURL);
    // updater.checkForUpdates(parsedURL.origin, true);
    autoUpdater.checkForUpdates();
  });

  // Request from the renderer process
  // ipcMain.on('streamview', (event, arg) => {
  //   console.log('streamview>', arg.url, arg.id);
  //   // const allweb = electron.webContents.getAllWebContents();
  //   // allweb.forEach((web) => {
  //   //   console.log('web>', web.id, web);
  //   // });
  // });
}

/**
 * Dealing with certificate issues
 * used to be done in Webview app but seems to work better here now
 */
app.on('certificate-error', function (event, webContent, url, error, certificate, callback) {
  // This doesnt seem like a security risk yet
  if (error === 'net::ERR_CERTIFICATE_TRANSPARENCY_REQUIRED') {
    // console.log('Webview> certificate error ERR_CERTIFICATE_TRANSPARENCY_REQUIRED', url);
    // we ignore the certificate error
    event.preventDefault();
    callback(true);
  } else if (error === 'net::ERR_CERT_COMMON_NAME_INVALID') {
    // self-signed certificate
    // console.log('Webview> certificate error ERR_CERT_COMMON_NAME_INVALID', url)
    // we ignore the certificate error
    event.preventDefault();
    callback(true);
  } else if (error === 'net::ERR_CERT_AUTHORITY_INVALID') {
    // self-signed certificate
    // console.log('Webview> certificate error ERR_CERT_AUTHORITY_INVALID', url)
    // we ignore the certificate error
    event.preventDefault();
    callback(true);
  } else {
    // More troubling error
    console.log('Webview> certificate error', error, url);
    // Denied
    callback(false);
  }
});

if (process.platform === 'win32') {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    // For first instance
    const count = process.argv.length;
    if (count > 2) {
      const lastarg = process.argv[count - 1];
      const newurl = lastarg.replace('sage3://', 'https://');
      if (mainWindow) {
        mainWindow.loadURL(newurl);
      } else {
        // save the URL for later
        gotoURL = newurl;
      }
    }

    // Happens when a window is already opened
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      const lastarg = commandLine[commandLine.length - 1];
      // Focus on the main window.
      if (mainWindow && lastarg) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        const newurl = lastarg.replace('sage3://', 'https://');
        mainWindow.loadURL(newurl);
      } else {
        // save the URL for later
        gotoURL = newurl;
      }
    });
  }
}

//
// Protocol handler sage3://
// Handle the custom protocol
//
// Protocol handler for osx while application is not running in the background.
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Parsing the URL to find if there is a port number
  // Asuming that if there is a port number, it is a local server with http
  // Otherwise, it is a remote server with https
  const parsedURL = new URL(url);
  // make it a valid URL
  const newurl = url.replace('sage3://', parsedURL.port ? 'http://' : 'https://');
  if (mainWindow) {
    mainWindow.loadURL(newurl);
  } else {
    // save the URL for later
    gotoURL = newurl;
  }
});

/**
 * Quit when all windows are closed.
 */
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  app.quit();
  // }
});

/**
 * activate callback
 * On OS X it's common to re-create a window in the app when the
 * dock icon is clicked and there are no other window open.
 */
app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async function (event) {
  event.preventDefault();
  saveState();
  // Analytics on stop
  if (analytics_enabled) {
    await analyticsOnStop(userId);
  }
  process.exit(0);
});

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create a browser window.
 */
app.on('ready', createWindow);
