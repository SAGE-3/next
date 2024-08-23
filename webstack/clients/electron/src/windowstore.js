/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Persistent storage for electron app: used for window position
const Store = require('electron-store');
const uuid = require('uuid');

// Persistent data store to store window postion/size
// stored by default in app.getPath('userData')
// Create a store
const store = new Store({ name: 'sage3-window' });

// Default Window State
const defaultWindowState = {
  // server: 'https://sage3.app',
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
  getWindow: function () {
    return store.get('window-state', defaultWindowState);
  },
  setWindow: function (value) {
    return store.set('window-state', value);
  },
  getClean: function () {
    return store.get('clean', false);
  },
  setClean: function (value) {
    return store.set('clean', value);
  },
  default: function () {
    store.set('window-state', defaultWindowState);
  },
  clear: function () {
    return store.clear();
  },
};
