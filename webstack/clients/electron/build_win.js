/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller;
const path = require('path');

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });

function getInstallerConfig() {
  console.log('creating windows installer');
  const rootPath = path.join('./');
  const outPath = path.join(rootPath, './');

  return Promise.resolve({
    appDirectory: path.join(outPath, './SAGE3-win32-x64'),
    authors: 'SAGE3 Team', // 'Ryan Theriot',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'SAGE3.exe',
    setupExe: 'SAGE3-Installer.exe',
    setupIcon: path.join(rootPath, 's3.ico'),
  });
}
