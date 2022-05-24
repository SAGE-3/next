/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

const fs = require('fs');
var electron_notarize = require('electron-notarize');

async function GO() {
  console.log('Starting');
  // Same appId in electron-builder.
  let appId = 'app.sage3';
  let appPath = 'SAGE3_client-darwin-x64/SAGE3_client.app';
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }
  console.log(`Notarizing ${appId} found at ${appPath}`);
  try {
    await electron_notarize.notarize({
      appBundleId: appId,
      appPath: appPath,
      appleId: ' XXXX '
      appleIdPassword: ' YYYYY ', // an application specific password
      ascProvider: ' ZZZZZ ',
    });
  } catch (error) {
    console.error(error);
  }
  console.log(`Done notarizing ${appId}`);
}

GO();
