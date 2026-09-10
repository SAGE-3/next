/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Sends anonymous usage analytics (app start/stop) to the SAGE3 events server.

import { screen } from 'electron';
import pkg from '../package.json' with { type: 'json' };
import os from 'os';
import { randomUUID } from 'crypto';

// Endpoint that collects the analytics events
const server_url = 'https://sage3.evl.uic.edu/events';

/*
 * Send analytics event when the app starts
 * @param {string} userId
 * @param {string} arg_url
 * */
function analyticsOnStart(userId, arg_url) {
  // Get the screen sizes
  const displays = screen.getAllDisplays();
  const screens = [];
  for (const d of displays) {
    const { label, size, scaleFactor, rotation } = d;
    screens.push({ label, width: size.width, height: size.height, scaleFactor, rotation });
  }

  // Get the version from the package file
  const version = pkg.version;

  // OS information
  const osInfo = { platform: os.platform(), release: os.release(), arch: os.arch() };

  // CPU information
  const cpuInfo = { model: os.cpus()[0].model, cores: os.cpus().length, mem: os.totalmem() / (1024 * 1024 * 1024) };

  // Client IP address
  const ip = getMachineIP();

  const dateObj = new Date();
  // Locale and timezone from the running environment
  const options = Intl.DateTimeFormat().resolvedOptions();

  const event_start = {
    event: 'start',
    userId,
    version,
    os: osInfo,
    cpu: cpuInfo,
    screens,
    date: dateObj.toISOString(),
    locale: options.locale,
    timezone: options.timeZone,
    url: arg_url,
    ip,
  };

  // Fire-and-forget POST; errors are logged, not thrown
  fetch(server_url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event_start),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Analytics> on_start', data);
    })
    .catch((err) => {
      console.log('Analytics> error', err.message);
    });
}

/*
 * Send analytics event when the app stops
 * @param {string} userId
 * */
async function analyticsOnStop(userId) {
  const dateEnd = new Date();
  const event_stop = {
    event: 'stop',
    date: dateEnd.toISOString(),
    userId,
  };

  try {
    const res = await fetch(server_url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event_stop),
    });
    const data = await res.json();
    console.log('Analytics> on_stop', data);
  } catch (err) {
    console.log('Analytics> error', err.message);
  }
}

// Generate a random anonymous user id (persisted by the caller across sessions)
function genUserId() {
  return randomUUID();
}

export { analyticsOnStart, analyticsOnStop, genUserId };

// Return the first external IPv4 address, or a fallback if none is found
function getMachineIP() {
  var ifaces = os.networkInterfaces();
  var values = Object.keys(ifaces).map(function (name) {
    return ifaces[name];
  });
  values = [].concat.apply([], values).filter(function (val) {
    return val.family == 'IPv4' && val.internal == false;
  });
  return values.length ? values[0].address : '0.0.0.0';
}
