/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Persistent store of the app window's position/size so it reopens where it was.
const Store = require('electron-store');

// On-disk store (sage3-window.json in app.getPath('userData'))
// Persistent data store to store window postion/size
// stored by default in app.getPath('userData')
// Create a store
const store = new Store({ name: 'sage3-window' });

// Window state used on first run, before anything is saved
// Default Window State
const defaultWindowState = {
  // server: 'https://chicago.sage3.app',
  server: 'file://html/landing.html',
  fullscreen: false,
  x: 0,
  y: 0,
  width: 1280,
  height: 800,
};
store.get('window-state', defaultWindowState);
store.get('clean', false);

module.exports = {
  // Saved window geometry (falls back to defaults if none stored)
  getWindow: function () {
    return store.get('window-state', defaultWindowState);
  },
  // Persist the current window geometry
  setWindow: function (value) {
    return store.set('window-state', value);
  },
  // "clean" flag: whether to start from a fresh/reset state
  getClean: function () {
    return store.get('clean', false);
  },
  setClean: function (value) {
    return store.set('clean', value);
  },
  // Reset window geometry to defaults
  default: function () {
    store.set('window-state', defaultWindowState);
  },
  // Wipe the entire store
  clear: function () {
    return store.clear();
  },
};
