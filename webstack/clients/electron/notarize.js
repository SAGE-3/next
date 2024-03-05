/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const fs = require('fs');
var electron_notarize = require('@electron/notarize');

async function GO() {
  console.log('Starting');

  // Same appId in electron-builder.
  let appId = 'app.sage3';
  let appPath = 'SAGE3-darwin-x64/SAGE3.app';
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`);

  try {
    await electron_notarize.notarize({
      tool: 'notarytool',
      appBundleId: appId,
      appPath: appPath,
      // Apple ID  toto@mac.com
      appleId: process.env.APPLE_ID || 'XXXX',
      // an application specific password
      appleIdPassword: process.env.APPLE_ID_PWD || 'YYYYY',
      // number at end of `security find-identity -p basic -v`
      teamId: process.env.APPLE_TEAM_ID || 'ZZZZZ',
    });
  } catch (error) {
    console.error(error);
  }

  console.log(`Done notarizing ${appId}`);
}

GO();
