/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

const electron = require('electron');
// const { app, BrowserWindow } = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
console.log(electron, Object.keys(electron));
console.log(app);

makeElectronBasicWindow('http://localhost:4200');

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

function makeElectronBasicWindow(url) {
  // On macs, ensure the app (Electron) quits after all windows are closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit(); // After testing, doesn't work?
    }
  });

  // When app (Electron) is ready open a window
  app.whenReady().then(() => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        webviewTag: true,
      },
    });

    // What to show on the electron window
    // win.loadFile(url);
    win.loadURL(url);
  });
}
