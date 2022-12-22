/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// ---------------------------------------------------------------------------
// Built into node
const path = require('path');
// Npm installed
const { app, BrowserWindow } = require('electron');

// ---------------------------------------------------------------------------
const urlToLoad = 'http://localhost:4200/'; // Dev address
// const urlToLoad = "http://hawaii.edu"; // Sanity check

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

// On Mac app can still be running without any windows
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,

      preload: path.join(__dirname, 'preload.js'), // use a preload script
      devTools: true,
      webSecurity: true, // Set to false to disable coors

      disableDialogs: true,
      backgroundThrottling: false,
      allowRunningInsecureContent: true,
      allowDisplayingInsecureContent: true,
      experimentalFeatures: true,

      // If true, preload script run in separate context
      // Note: this also disables console.log from the page itself
      // contextIsolation: true,
    },
  });
  console.log('Opening electron window');
  win.loadURL(urlToLoad);
});
