/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Electron
const electron = require('electron');
const { app, dialog, Menu, Tray, nativeImage } = require('electron');
const shell = electron.shell;
const path = require('path');

// Stores
const windowStore = require('./windowstore');
const bookmarkStore = require('./bookmarkstore');

// Utils
const { updateLandingPage, dialogUserTextInput, checkServerIsSage, takeScreenshot } = require('./utils');
// const updater = require('./updater');

/**
 * Build a menu template for a window
 * @param {*} window
 * @returns
 */
function buildSageMenu(window, commander) {
  let tray = null;
  app.whenReady().then(() => {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'images', 'trayTemplate.png')));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Main Window',
        click: function () {
          window.show();
        },
      },
      {
        label: 'Hide Main Window',
        click: function () {
          window.blur();
        },
      },
      {
        label: 'Check for Updates...',
        click() {
          const autoUpdater = electron.autoUpdater;
          autoUpdater.once('update-not-available', (e) => {
            const version = electron.app.getVersion();
            const dialogOpts = {
              type: 'info',
              buttons: ['Ok'],
              title: 'Application Update',
              message: 'No SAGE3 update available.',
              detail: `You are running the latest version (${version}) of the SAGE3 client.`,
            };
            dialog.showMessageBox(dialogOpts);
          });
          autoUpdater.checkForUpdates();
        },
      },
      {
        label: 'Quit SAGE3',
        accelerator: 'CommandOrControl+Q',
        click: function () {
          electron.app.quit();
        },
      },
    ]);
    tray.setToolTip('SAGE3 Menubar');
    tray.setContextMenu(contextMenu);
  });

  // Clear Bookmarks button
  const clearBookmarks = {
    label: 'Restore Original Server List',
    click: () => {
      bookmarkStore.clear();
      buildMenu(window);
      updateLandingPage(window);
    },
  };

  // Add the current location to the bookmarks
  const addBookmark = {
    label: 'Save current Server',
    click: async () => {
      const url = window.webContents.getURL();
      const isSage = await checkServerIsSage(url);
      if (!isSage) return;
      const name = await dialogUserTextInput('Name of Server', 'Name', '');
      if (name) {
        bookmarkStore.addBookmark(name, url);
        buildMenu(window);
        updateLandingPage(window);
      }
    },
  };

  // Create bookmarks submenu
  const bookmarks = bookmarkStore.getBookmarks().map((el) => {
    return {
      label: `${el.name}`,
      click() {
        if (window) {
          window.loadURL(el.url);
        }
      },
    };
  });

  // Remove a bookmark submenu
  const removeBookmarks = bookmarkStore.getBookmarks().map((el) => {
    return {
      label: `${el.name}`,
      click() {
        bookmarkStore.removeBookmark(el.id);
        buildMenu(window);
        updateLandingPage(window);
      },
    };
  });

  // Menu template
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Return To Server List',
          click() {
            if (window) {
              window.loadFile('./html/landing.html');
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Check for Updates...',
          click() {
            if (window) {
              const autoUpdater = electron.autoUpdater;
              autoUpdater.once('update-not-available', (e) => {
                const version = electron.app.getVersion();
                const dialogOpts = {
                  type: 'info',
                  buttons: ['Ok'],
                  title: 'Application Update',
                  message: 'No SAGE3 update available.',
                  detail: `You are running the latest version (${version}) of the SAGE3 client.`,
                };
                dialog.showMessageBox(dialogOpts);
              });
              autoUpdater.checkForUpdates();
            }
          },
        },
        {
          label: 'Clear Caches',
          click: function () {
            windowStore.default();
            bookmarkStore.clear();
            // Clear the caches, useful to remove password cookies
            const session = electron.session.defaultSession;
            session.clearStorageData({ storages: ['appcache', 'cookies', 'local storage', 'serviceworkers'] }).then(() => {
              console.log('Electron>	Caches cleared');

              dialog.showMessageBox({
                type: 'warning',
                title: 'Preferences Cleared',
                message: 'Preferences have been cleared. Restart SAGE3 to continue.',
                buttons: ['Ok'],
              });
            });
          },
        },
        {
          label: 'Clear Preferences on Quit',
          type: 'checkbox',
          checked: windowStore.getClean(),
          click: function (e) {
            console.log('Electron>	Clear preferences on quit: ', e.checked);
            // clear on quit
            commander.clear = e.checked;
            windowStore.setClean(e.checked);
          },
        },
        {
          label: 'Take Screenshot',
          click() {
            takeScreenshot(window);
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'CommandOrControl+Q',
          click: function () {
            electron.app.quit();
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
            if (window) {
              window.webContents.setZoomLevel(0);
            }
          },
        },
        {
          label: 'Zoom In',
          accelerator: 'CommandOrControl+=',
          // role: 'zoomIn',
          click() {
            if (window) {
              const zl = window.webContents.getZoomLevel();
              if (zl < 10) {
                window.webContents.setZoomLevel(zl + 1);
              }
            }
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CommandOrControl+-',
          // role: 'zoomOut',
          click() {
            if (window) {
              const zl = window.webContents.getZoomLevel();
              if (zl > -8) {
                window.webContents.setZoomLevel(zl - 1);
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
                window.setMenuBarVisibility(true);
              } else {
                focusedWindow.setFullScreen(true);
                window.setMenuBarVisibility(false);
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
            if (window) {
              window.loadURL('http://localhost:4200/');
            }
          },
        },
      ],
    },
    {
      label: 'Servers',
      role: 'bookmarks',
      submenu: [
        ...bookmarks,
        {
          type: 'separator',
        },
        addBookmark,
        {
          type: 'separator',
        },
        {
          label: 'Remove Server',
          submenu: removeBookmarks,
        },
        clearBookmarks,
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
          label: 'About SAGE3',
          click() {
            const version = electron.app.getVersion();
            const dialogOpts = {
              type: 'info',
              buttons: ['Ok'],
              title: 'SAGE3 Client',
              message: `Version ${version}`,
              detail: `Copyright © 2024 Project SAGE3`,
            };
            dialog.showMessageBox(dialogOpts);
          },
        },
        {
          label: 'Quick Start Guide',
          click: function () {
            shell.openExternal('https://sage-3.github.io/pdf/SAGE3-v1.0.16-2024a.pdf');
          },
        },
        {
          label: 'Discord Server (Online Forum)',
          click: function () {
            shell.openExternal('https://discord.gg/hHsKu47buY');
          },
        },
        {
          label: 'SAGE3 Newsletter',
          click: function () {
            shell.openExternal('https://sage3.curated.co');
          },
        },
        {
          label: 'Keyboard Shortcuts',
          click: function () {
            shell.openExternal('https://sage-3.github.io/docs/Shortcuts');
          },
        },
        {
          label: 'Developer Site',
          click: function () {
            shell.openExternal('https://sage-3.github.io/docs/intro');
          },
        },
        {
          label: 'Main Site',
          click: function () {
            shell.openExternal('http://sage3.sagecommons.org/');
          },
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    const name = electron.app.name;
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
            electron.app.quit();
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

/**
 * Build the electron Menu system
 * @param {Electron.BrowserWindow} The electron browser window menu to build
 */
function buildMenu(window, commander) {
  const menu = buildSageMenu(window, commander);
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(menu));
}

module.exports = {
  buildMenu,
};
