/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const { ipcRenderer, contextBridge } = require('electron');

const validChannels = [
  'client-info-response',
  'client-info-request',
  'client-update-check',
  'request-sources',
  'set-source',
  'connect-url',
  'asynchronous-message',
  'close-connect-page',
  'take-screenshot',
  'streamview',
  'streamview_stop',
  'paint',
  'load-landing',
  'store-interface',
  'hide-main-window',
  'show-main-window',
  'request-current-display',
  'current-display',
  'open-external-url',
  'open-webview',
  'get-servers-request',
  'get-servers-response',
  'set-scale-level',
];

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, callback) => {
    if (validChannels.includes(channel)) {
      // Filtering the event param from ipcRenderer
      const newCallback = (_, data) => callback(data);
      ipcRenderer.on(channel, newCallback);
    }
  },
  once: (channel, callback) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_, data) => callback(data);
      ipcRenderer.once(channel, newCallback);
    }
  },
  removeListener: (channel, callback) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  removeAllListeners: (channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
