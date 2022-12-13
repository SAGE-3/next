/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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
const { join } = path;
const fs = require('fs');
const url = require('url');
// Get platform and hostname
var os = require('os');
const { platform, homedir } = os;

// NPM modules
const electron = require('electron');
// Persistent storage for electron app: used for window position
const Store = require('electron-store');
// parsing command-line arguments
var program = require('commander');

// URL received from protocol sage3://
var gotoURL = '';

// Application modules in 'src'
// Hashing function
var md5 = require('./src/md5');
// update system
const updater = require('./src/updater');
// Get the version from the package file
var version = require('./package.json').version;
// First run
var firstRun = true;

//
// handle install/update for Windows
//
if (require('electron-squirrel-startup')) {
  return;
}
// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function (command, args) {
    let spawnedProcess;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, { detached: true });
    } catch (error) {
      // pass
    }

    return spawnedProcess;
  };

  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;
    case '--squirrel-uninstall':
      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;
    case '--squirrel-obsolete':
      app.quit();
      return true;
  }
}

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// with Electron version >= 17, sources available in the main process
const desktopCapturer = electron.desktopCapturer;
const Menu = electron.Menu;
const shell = electron.shell;
// Module to handle ipc with Browser Window
const ipcMain = electron.ipcMain;

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

// Persistent data store to store window postion/size
// stored by default in app.getPath('userData')
// Create a store
const store = new Store({ name: 'sage3' });
// Store values in a key called 'window-state'
const defaults = store.get('window-state', {
  server: 'https://sage3.app',
  fullscreen: false,
  x: 0,
  y: 0,
  width: 1280,
  height: 720,
});

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
program
  .version(version)
  .option('-d, --display <n>', 'Display client ID number (int)', parseInt, 0)
  .option('-f, --fullscreen', 'Fullscreen (boolean)', defaults.fullscreen)
  .option('-m, --monitor <n>', 'Select a monitor (int)', myParseInt, null)
  .option('-n, --no_decoration', 'Remove window decoration (boolean)', false)
  .option('-s, --server <s>', 'Server URL (string)', defaults.server || 'https://sage3.app')
  .option('-x, --xorigin <n>', 'Window position x (int)', myParseInt, defaults.x)
  .option('-y, --yorigin <n>', 'Window position y (int)', myParseInt, defaults.y)
  .option('-c, --clear', 'Clear window preferences', false)
  .option('--allowDisplayingInsecure', 'Allow displaying of insecure content (http on https)', true)
  .option('--allowRunningInsecure', 'Allow running insecure content (scripts accessed on http vs https)', true)
  .option('--cache', 'Clear the cache at startup', false)
  .option('--console', 'Open the devtools console', false)
  .option('--debug', 'Open the port debug protocol (port number is 9222 + clientID)', false)
  .option('--experimentalFeatures', 'Enable experimental features', false)
  .option('--height <n>', 'Window height (int)', myParseInt, defaults.height)
  .option('--disable-hardware', 'Disable hardware acceleration', false)
  .option('--show-fps', 'Display the Chrome FPS counter', false)
  .option('--profile <s>', 'Create a profile (string)')
  .option('--width <n>', 'Window width (int)', myParseInt, defaults.width);
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
  store.clear();
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

// SAGE2 Google maps APIKEY
// needed for user geo-location service
process.env.GOOGLE_API_KEY = 'AIzaSyANE6rJqcfc7jH-bDOwhXQZK_oYq9BWRDY';

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
  copyright: 'Copyright © 2021 Project SAGE3',
  website: 'https://www.sage3.app/',
});

// Filename of favorite sites file
const favorites_file_name = 'sage3_favorite_sites.json';
// Object containing list of favorites sites
var favorites = {
  list: [],
};

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 */
var mainWindow;
var remoteSiteInputWindow;

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

/**
 * Take a Screenshot of the visible part of the window
 */
function TakeScreenshot() {
  if (mainWindow) {
    // Capture the Electron window
    mainWindow.capturePage().then(function (img) {
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
        defaultPath: app.getPath('downloads') + '/screenshot' + dt + '.jpg',
      };
      // Open the save dialog
      electron.dialog.showSaveDialog(mainWindow, options).then((obj) => {
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
 * Creates an electron window.
 *
 * @method     createWindow
 */
function createWindow() {
  // Build a menu
  var menu = buildMenu();
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

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
      contextIsolation: false,
      webSecurity: true,
      backgroundThrottling: false,
      allowDisplayingInsecureContent: commander.allowDisplayingInsecure,
      allowRunningInsecureContent: commander.allowRunningInsecure,
      // this enables things like the CSS grid. add a commander option up top for enable / disable on start.
      experimentalFeatures: commander.experimentalFeatures ? true : false,
      // Hack to preload jquery for broken sites
      preload: path.resolve(path.join(__dirname, 'preload.js')),
    },
  };

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

  // Function to get values back from the store
  const restore = () => store.get('window-state', defaultSize);
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
  // Function to save the state in the data store
  const saveState = () => {
    if (!mainWindow.isMinimized()) {
      Object.assign(state, getCurrentPosition());
    }
    state.fullscreen = mainWindow.isFullScreen();
    state.server = mainWindow.webContents.getURL();
    store.set('window-state', state);
    if (commander.clear) {
      console.log('Preferences> clear all');
      store.clear();
    }
  };
  // Restore the state
  state = ensureVisibleOnSomeDisplay(restore());

  // Deny geolocation on Mac, it causes a crash in Electron v13
  const session = electron.session.defaultSession;
  disableGeolocation(session);

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

  // Build a warning view in case of load failing
  let warningView = new electron.BrowserView({
    webPreferences: { nodeIntegration: false },
  });
  warningView.setAutoResize({ width: true, height: true });
  warningView.webContents.loadFile('./warning.html');

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
          filename: evt.sender.getFilename(),
          bytes: evt.sender.getTotalBytes(),
          completed: true,
        });
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });

  // Mute the audio (just in case)
  // var playAudio = commander.audio || commander.display === 0;
  // mainWindow.webContents.audioMuted = !playAudio;

  // Open the DevTools.
  if (commander.console) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', saveState);
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

  // when the display client is loaded
  mainWindow.webContents.on('did-finish-load', function () {
    if (mainWindow.isFullScreen()) {
      mainWindow.setMenuBarVisibility(false);
    }

    // Check for updates
    if (firstRun) {
      const currentURL = mainWindow.webContents.getURL();
      const parsedURL = new URL(currentURL);
      updater.checkForUpdates(parsedURL.origin, false);
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
  let tries = 4;
  mainWindow.webContents.on('did-fail-load', function () {
    // Get the current window size
    const [width, height] = mainWindow.getContentSize();
    // Show the warning view
    mainWindow.setBrowserView(warningView);
    warningView.setBounds({ x: 0, y: 0, width, height });

    // Since the window has buttons, I don't think we should try to reload the page anymore. People get stuck in a infiinite loop
    // // Retry to load the original URL
    // if (tries) {
    //   setTimeout(function () {
    //     tries--;
    //     mainWindow.reload();
    //   }, 1000);
    // } else {
    //   // When failed to load, redirect to the main server
    //   mainWindow.loadURL('https://sage3.app/');
    //   mainWindow.setBrowserView(null);
    //   // Reset the counter
    //   tries = 4;
    // }
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

    const sender = event.sender;
    sender.on('ipc-message', function (evt, channel, args) {
      console.log('Webview> IPC Message', evt.frameId, evt.processId, evt.reply);
      // console.log('Webview>    message', channel, args);
      // Message for the webview pixel streaming
      if (channel === 'streamview') {
        const viewContent = electron.webContents.fromId(args.id);
        viewContent.beginFrameSubscription(true, (image, dirty) => {
          let dataenc;
          let neww, newh;
          const devicePixelRatio = 2;
          const quality = 50;
          if (devicePixelRatio > 1) {
            neww = dirty.width / devicePixelRatio;
            newh = dirty.height / devicePixelRatio;
            const resizedimage = image.resize({ width: neww, height: newh });
            dataenc = resizedimage.toJPEG(quality);
          } else {
            dataenc = image.toJPEG(quality);
            neww = dirty.width;
            newh = dirty.height;
          }
          evt.reply('paint', {
            buf: dataenc.toString('base64'),
            dirty: { ...dirty, width: neww, height: newh },
          });
        });
      }
    });

    // Override the UserAgent variable: make websites behave better
    // Not permanent solution: here pretending to be Google Chrome
    // params.useragent =
    //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';
  });

  app.on('web-contents-created', function (webContentsCreatedEvent, contents) {
    if (contents.getType() === 'webview') {
      contents.on('new-window', function (newWindowEvent, url) {
        console.log('block');
        newWindowEvent.preventDefault();
      });
    }
  });

  // New webview added
  mainWindow.webContents.on('did-attach-webview', function (event, webContents) {
    disableGeolocation(webContents.session);
  });

  // Block the zoom limits
  // i.e. pinch-to-zoom events now scale the board like a scroll event
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  // Catch the close connection page event
  ipcMain.on('close-connect-page', (e, value) => {
    // remoteSiteInputWindow.close();
    // remoteSiteInputWindow = undefined;
  });

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
    // Close input window
    // if (remoteSiteInputWindow) {
    //   remoteSiteInputWindow.close();
    //   remoteSiteInputWindow = undefined;
    // }
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

  // Request for a screenshot from the web client
  ipcMain.on('take-screenshot', () => {
    TakeScreenshot();
  });

// Request Client Info
  ipcMain.on('client-info-request', () => {
    const info = {
      version: version,
    }
    console.log('client request',info)
      mainWindow.webContents.send('client-info-response', info);
   
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
 * Writes favorites in a persistent way on local machine
 *
 * @method writeFavoritesOnFile
 * @param {Object} favorites_obj the object containing the list of favorites
 */
function writeFavoritesOnFile(favorites_obj) {
  fs.writeFile(getAppDataPath(favorites_file_name), JSON.stringify(favorites_obj, null, 4), 'utf8', () => {});
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
  // make it a valid URL
  const newurl = url.replace('sage3://', 'https://');
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

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create a browser window.
 */
app.on('ready', createWindow);

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
 * Opens a SAGE2 interface in browser.
 *
 * @method     openInterfaceInBrowser
 */
function openInterfaceInBrowser() {
  // function to start a process
  var exec = require('child_process').exec;
  // build the URL
  let uiURL = 'https://' + currentServer + '/index.html';
  // How to open an URL on each platform
  let opener;

  switch (process.platform) {
    case 'darwin':
      opener = 'open -a "Google Chrome"';
      break;
    case 'win32':
      opener = 'start "" "Chrome"';
      break;
    default:
      opener = 'xdg-open';
      break;
  }
  // Lets go
  exec(opener + ' "' + uiURL + '"', (error, stdout, stderr) => {
    if (error) {
      // In case of error, use the OS default app
      electron.shell.openExternal(uiURL);
    }
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Go to Chicago server',
          click() {
            if (mainWindow) {
              mainWindow.loadURL('https://sage3.app/');
            }
          },
        },
        {
          label: 'Go to Hawaii server',
          click() {
            if (mainWindow) {
              mainWindow.loadURL('https://manoa.sage3.app');
            }
          },
        },
        {
          label: 'Go to Development server',
          click() {
            if (mainWindow) {
              mainWindow.loadURL('https://mini.sage3.app');
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Check for Updates...',
          // accelerator: 'CommandOrControl+U',
          click() {
            if (mainWindow) {
              const currentURL = mainWindow.webContents.getURL();
              const parsedURL = new URL(currentURL);
              updater.checkForUpdates(parsedURL.origin, true);
            }
          },
        },
        {
          label: 'Clear Preferences',
          click: function () {
            // clear on quit
            commander.clear = true;
          },
        },
        {
          label: 'Take Screenshot',
          click() {
            TakeScreenshot();
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'CommandOrControl+Q',
          click: function () {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CommandOrControl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CommandOrControl+Z',
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: 'Cut',
          accelerator: 'CommandOrControl+X',
          role: 'cut',
        },
        {
          label: 'Copy',
          accelerator: 'CommandOrControl+C',
          role: 'copy',
        },
        {
          label: 'Paste',
          accelerator: 'CommandOrControl+V',
          role: 'paste',
        },
        {
          label: 'Select All',
          accelerator: 'CommandOrControl+A',
          role: 'selectall',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload Site',
          accelerator: 'CommandOrControl+R',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Actual Size',
          accelerator: 'CommandOrControl+0',
          // role: 'resetZoom',
          click() {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          },
        },
        {
          label: 'Zoom In',
          accelerator: 'CommandOrControl+=',
          // role: 'zoomIn',
          click() {
            if (mainWindow) {
              const zl = mainWindow.webContents.getZoomLevel();
              if (zl < 10) {
                mainWindow.webContents.setZoomLevel(zl + 1);
              }
            }
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CommandOrControl+-',
          // role: 'zoomOut',
          click() {
            if (mainWindow) {
              const zl = mainWindow.webContents.getZoomLevel();
              if (zl > -8) {
                mainWindow.webContents.setZoomLevel(zl - 1);
              }
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Toggle Full Screen',
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Ctrl+Command+F';
            } else {
              return 'F11';
            }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              // focusedWindow.fullScreenable = !focusedWindow.isFullScreen();
              focusedWindow.fullScreenable = true;
              if (focusedWindow.isFullScreen()) {
                focusedWindow.setFullScreen(false);
                mainWindow.setMenuBarVisibility(true);
              } else {
                focusedWindow.setFullScreen(true);
                mainWindow.setMenuBarVisibility(false);
              }
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I';
            } else {
              return 'Ctrl+Shift+I';
            }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.toggleDevTools();
            }
          },
        },
        {
          label: 'Open local server (http://localhost:4200)',
          click() {
            if (mainWindow) {
              mainWindow.loadURL('http://localhost:4200/');
            }
          },
        },
      ],
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CommandOrControl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CommandOrControl+W',
          role: 'close',
        },
      ],
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: function () {
            shell.openExternal('http://sage3.sagecommons.org/');
          },
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    const name = app.name;
    template.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about',
        },
        {
          type: 'separator',
        },
        {
          label: 'Services',
          role: 'services',
          submenu: [],
        },
        {
          type: 'separator',
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers',
        },
        {
          label: 'Show All',
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function () {
            app.quit();
          },
        },
      ],
    });
    const windowMenu = template.find(function (m) {
      return m.role === 'window';
    });
    if (windowMenu) {
      windowMenu.submenu.push(
        {
          type: 'separator',
        },
        {
          label: 'Bring All to Front',
          role: 'front',
        }
      );
    }
  }

  return template;
}
