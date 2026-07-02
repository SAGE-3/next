/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Updating mechanism for Electron client
 * @author <a href="mailto:renambot@gmail.com">Luc Renambot</a>
 * @version 1.0.0
 */

// Node modules
const path = require('path');

// NPM modules
const electron = require('electron');
// HTTP query
const https = require('https');
const http = require('http');
// Update servers may use self-signed certificates
const agent = new https.Agent({
  rejectUnauthorized: false,
});

// GET a URL and parse the JSON response. Uses node's http/https directly
// (rather than the global fetch) so the permissive agent above can tolerate
// self-signed certificates on https update servers.
function getJSON(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const options = isHttps ? { agent } : undefined;
    lib
      .get(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`Request failed with status ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

// Versions
const semver = require('semver');

async function checkForUpdates(server, opendialog = false) {
  const pkg = require(path.join(electron.app.getAppPath(), 'package.json'));
  const localv = semver.parse(pkg.version);
  console.log('Updater> current version', localv.version);

  const update_server = server;
  const update_path = '/assets/version.json';
  const update_url = new URL(update_path, update_server);

  try {
    const data = await getJSON(update_url);
    console.log('Updater> release', data.releases[0]);
    // if not the expected data structure, stop
    if (!data.currentRelease) return;
    const remotev = semver.parse(data.currentRelease);
    const versions = data.releases;
    // sort the array of versions received
    versions.sort(function (a, b) {
      let av = semver.parse(a.version);
      let bv = semver.parse(b.version);
      // reverse compare
      return semver.rcompare(av, bv);
    });
    if (semver.gt(remotev, localv)) {
      console.log('Updater> you have to update', data.releases[0]);
      // pick the first one after the sort
      showUpdateDialog(localv.version, versions[0]);
    } else {
      if (opendialog) showDialog('You are already running the latest version:\n' + localv.version);
    }
  } catch (error) {
    console.log('Updater> Unable to check for updates.', error);
  }
}

/**
 * Info Dialog
 *
 * @param {any} current
 * @param {any} release
 */
function showUpdateDialog(current, release) {
  electron.dialog
    .showMessageBox({
      title: electron.app.getName(),
      type: 'info',
      textWidth: 400,
      message: `New release available\n\nDownload, Update and Restart SAGE3`,
      detail: `Installed Version: ${current}\nLatest Version: ${release.version}\n\nNotes: ${release.notes}`.trim(),
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })
    .then(({ response }) => {
      if (response === 0) {
        setImmediate(() => {
          // pick the right url for current machine
          console.log('Updater> arch', process.platform, process.arch);
          let platform = process.platform;
          if (platform === 'darwin') {
            if (process.arch === 'arm64') {
              platform = 'darwinarm64';
            } else {
              platform = 'darwinintel';
            }
          }
          const dl = release[platform].url;
          // open web browser
          electron.shell.openExternal(dl);
        });
      }
    })
    .catch((error) => {
      throw new Error(error);
    });
}

/**
 * Open a simple dialog
 */
const showDialog = (detail, type = 'info') => {
  electron.dialog.showMessageBox({
    title: electron.app.getName(),
    message: 'Update Checker',
    textWidth: 300,
    buttons: ['Close'],
    defaultId: 0,
    cancelId: 0,
    type,
    detail,
  });
};

exports.checkForUpdates = checkForUpdates;
