/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const { screen } = require('electron');
const os = require('os');
const fetch = require('node-fetch');
const { v4 } = require('uuid');

// const server_url = 'http://localhost:3000/events';
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
  for (d of displays) {
    const { label, size, scaleFactor, rotation } = d;
    screens.push({ label, width: size.width, height: size.height, scaleFactor, rotation });
  }

  // Get the version from the package file
  var version = require('../package.json').version;

  // OS information
  const osInfo = { platform: os.platform(), release: os.release(), arch: os.arch() };

  // CPU information
  const cpuInfo = { model: os.cpus()[0].model, cores: os.cpus().length, mem: os.totalmem() / (1024 * 1024 * 1024) };

  // Client IP address
  const ip = getMachineIP();

  const dateObj = new Date();
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

  const res = await fetch(server_url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event_stop),
  });
  const data = await res.json();
  return data;
}

function genUserId() {
  return v4();
}

module.exports = {
  analyticsOnStart,
  analyticsOnStop,
  genUserId,
};

function getMachineIP() {
  var os = require('os');
  var ifaces = os.networkInterfaces();
  var values = Object.keys(ifaces).map(function (name) {
    return ifaces[name];
  });
  values = [].concat.apply([], values).filter(function (val) {
    return val.family == 'IPv4' && val.internal == false;
  });
  return values.length ? values[0].address : '0.0.0.0';
}
