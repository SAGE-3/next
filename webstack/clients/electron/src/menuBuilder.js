/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Electron
import electron, { app, dialog, Menu, Tray, nativeImage } from 'electron';
const shell = electron.shell;
import path from 'path';

// Stores
import windowStore from './windowstore.js';
import bookmarkStore from './bookmarkstore.js';

// Utils
import { updateLandingPage, dialogUserTextInput, checkServerIsSage, takeScreenshot } from './utils.js';

/**
 * Build a menu template for a window
 * @param {*} window
 * @returns
 */
function buildSageMenu(window, commander) {
  // System tray (menubar) icon with its own quick-access context menu, built once the app is ready
  let tray = null;
  app.whenReady().then(() => {
    tray = new Tray(nativeImage.createFromPath(path.join(import.meta.dirname, '..', 'images', 'trayTemplate.png')));
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
          // Trigger the electron auto-updater; only show a dialog when already up to date
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

  // Bookmarks == saved "Hubs" (SAGE3 servers). Reused as menu items in the Hubs menu below.
  // After any change, rebuild the whole menu and refresh the landing page so both stay in sync.

  // Clear Bookmarks button
  const clearBookmarks = {
    label: 'Restore Default Hub List',
    click: () => {
      bookmarkStore.clear();
      buildMenu(window);
      updateLandingPage(window);
    },
  };

  // Add the current location to the bookmarks
  const addBookmark = {
    label: 'Save current Hub',
    click: async () => {
      // Only bookmark the current page if it is actually a SAGE3 server
      const url = window.webContents.getURL();
      const isSage = await checkServerIsSage(url);
      if (!isSage) return;
      const name = await dialogUserTextInput('Name of Hub', 'Name', '');
      if (name) {
        bookmarkStore.addBookmark(name, isSage);
        buildMenu(window);
        updateLandingPage(window);
      }
    },
  };

  // Create bookmarks submenu: clicking a Hub navigates the window to that server
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

  // Menu template: array of top-level menus (File, Edit, View, Hubs, Window, Help)
  const template = [
    {
      label: 'File',
      submenu: [
        {
          // Go back to the local landing page listing all saved Hubs
          label: 'Return To Hub List',
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
          // Reset stored prefs/bookmarks and wipe browser session data (login cookies, etc.)
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
          // Checkbox toggle: persist a flag so prefs are wiped on next quit
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
      // Standard edit actions handled by Electron built-in roles (no custom click needed)
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
          // Reload the page and reset zoom back to 100%
          label: 'Refresh Content',
          accelerator: 'CommandOrControl+R',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.reload();
            }
            if (window) {
              window.webContents.setZoomLevel(0);
            }
          },
        },
        // {
        //   type: 'separator',
        // },
        // {
        //   label: 'Reset Size',
        //   accelerator: 'CommandOrControl+0',
        //   // role: 'resetZoom',
        //   click() {
        //     if (window) {
        //       window.webContents.setZoomLevel(0);
        //     }
        //   },
        // },
        // {
        //   label: 'Zoom In',
        //   accelerator: 'CommandOrControl+=',
        //   // role: 'zoomIn',
        //   click() {
        //     if (window) {
        //       const zl = window.webContents.getZoomLevel();
        //       if (zl < 10) {
        //         window.webContents.setZoomLevel(zl + 1);
        //       }
        //     }
        //   },
        // },
        // {
        //   label: 'Zoom Out',
        //   accelerator: 'CommandOrControl+-',
        //   // role: 'zoomOut',
        //   click() {
        //     if (window) {
        //       const zl = window.webContents.getZoomLevel();
        //       if (zl > -8) {
        //         window.webContents.setZoomLevel(zl - 1);
        //       }
        //     }
        //   },
        // },
        // {
        //   type: 'separator',
        // },
        {
          label: 'Toggle Full Screen',
          // Platform-specific shortcut: Ctrl+Cmd+F on macOS, F11 elsewhere
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Ctrl+Command+F';
            } else {
              return 'F11';
            }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              // Hide the menu bar while fullscreen, restore it when exiting
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
          type: 'separator',
        },
        {
          label: 'Toggle Developer Tools',
          // Platform-specific shortcut: Alt+Cmd+I on macOS, Ctrl+Shift+I elsewhere
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
          // Dev convenience: load a locally running SAGE3 server
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
      // Hubs menu: static navigation plus the dynamic saved-Hub items assembled above
      label: 'Hubs',
      role: 'bookmarks',
      submenu: [
        {
          label: 'Return To Hub List',
          click() {
            if (window) {
              window.loadFile('./html/landing.html');
            }
          },
        },
        {
          type: 'separator',
        },
        ...bookmarks,
        {
          type: 'separator',
        },
        addBookmark,
        {
          type: 'separator',
        },
        {
          label: 'Remove Hub',
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
          // Show an about dialog with the current app version; the rest open external URLs
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
            shell.openExternal('https://sage-3.github.io/pdf/SAGE3-v1.0.57-2026.pdf');
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

  // macOS only: prepend the standard app menu (About/Hide/Quit) as the first item,
  // and add "Bring All to Front" to the Window menu to match native Mac conventions
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
        },
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
  // Build the template and install it as the application-wide menu
  const menu = buildSageMenu(window, commander);
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(menu));
}

export { buildMenu };
