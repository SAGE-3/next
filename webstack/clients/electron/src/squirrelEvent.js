/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Handles Windows-only "Squirrel" installer events.
// Squirrel launches the app with a special --squirrel-* flag during install,
// update, and uninstall so it can create/remove shortcuts. We handle those and
// quit immediately. Returns true if a Squirrel event was handled (caller should
// then exit rather than open a window). No-op / false on other platforms.
import ChildProcess from 'child_process';
import path from 'path';
import { app } from 'electron';

function handleSquirrelEvent() {
  // No extra args means a normal launch, not a Squirrel event
  if (process.argv.length === 1) {
    return false;
  }

  // Locate Squirrel's Update.exe, which lives one level above the app folder
  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  // Spawn a detached child process, swallowing any failure
  const spawn = function (command, args) {
    let spawnedProcess;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, { detached: true });
    } catch (error) {
      // pass
    }

    return spawnedProcess;
  };

  // Run Update.exe with the given arguments
  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args);
  };

  // The Squirrel event is passed as the first command-line argument
  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    // On first install and on every update: (re)create shortcuts, then exit
    case '--squirrel-install':
    case '--squirrel-updated':
      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;
    // On uninstall: clean up shortcuts, then exit
    case '--squirrel-uninstall':
      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;
    // Old version being replaced: nothing to do but quit
    case '--squirrel-obsolete':
      app.quit();
      return true;
  }
}

export { handleSquirrelEvent };
