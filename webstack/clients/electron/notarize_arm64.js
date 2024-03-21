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
  let appPath = 'SAGE3-darwin-arm64/SAGE3.app';
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }
  console.log(`Notarizing ${appId} found at ${appPath}`);
  try {
    await electron_notarize.notarize({
      // tool: 'legacy',
      // appBundleId: appId,
      // appPath: appPath,
      // appleId: 'leluc@mac.com', // this is your apple ID it should be stored in an .env file
      // appleIdPassword: 'lbyb-ypil-xkyq-lwmb', // an application specific password
      // ascProvider: '63RP6MLQ63',

      tool: 'notarytool',
      appBundleId: appId,
      appPath: appPath,
      appleId: 'leluc@mac.com', // this is your apple ID it should be stored in an .env file
      appleIdPassword: 'lbyb-ypil-xkyq-lwmb', // an application specific password
      teamId: '63RP6MLQ63',
    });
  } catch (error) {
    console.error(error);
  }
  console.log(`Done notarizing ${appId}`);
}

GO();
