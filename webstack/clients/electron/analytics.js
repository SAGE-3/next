const { app, screen } = require('electron');
const os = require('os');
const fetch = require('node-fetch');
const { v4 } = require('uuid');

app.whenReady().then(async () => {
  const userId = genUserId();

  // Get the screen sizes
  const displays = screen.getAllDisplays();
  const screens = [];
  for (d of displays) {
    const { label, size, scaleFactor, rotation } = d;
    screens.push({ label, width: size.width, height: size.height, scaleFactor, rotation });
  }
  // console.log('Screens>', screens);

  // Get the version from the package file
  var version = require('./package.json').version;
  // console.log('Version>', version);

  // OS information
  const osInfo = { platform: os.platform(), release: os.release(), arch: os.arch() };
  // console.log('OS>', osInfo);

  // CPU information
  const cpuInfo = { model: os.cpus()[0].model, cores: os.cpus().length, mem: os.totalmem() / (1024 * 1024 * 1024) };
  // console.log('CPU>', cpuInfo);

  // Client IP address
  const ip = getMachineIP();
  // console.log('IP>', ip);

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
    ip,
  };
  console.log(event_start);

  // const server_url = 'http://localhost:3000/events';
  const server_url = 'https://sage3.evl.uic.edu/events';

  const p1 = await fetch(server_url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event_start),
  });
  const p1data = await p1.json();
  console.log('Return>', p1data);

  const dateEnd = new Date();
  const event_stop = {
    event: 'stop',
    date: dateEnd.toISOString(),
    userId,
  };

  const p2 = await fetch(server_url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event_stop),
  });
  const p2_data = await p2.json();
  console.log('Return>', p2_data);

  console.log(event_stop);

  process.exit(0);
});

function genUserId() {
  return v4();
}

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
