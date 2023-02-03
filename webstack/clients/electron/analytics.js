const { app, screen } = require('electron');
const os = require('os');
const fetch = require('node-fetch');

app.whenReady().then(async () => {
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

  // Geo location
  const apikey = 'e4f8364b415048fc85f3c48e0669e08e';
  const server = 'https://api.ipgeolocation.io/ipgeo';
  const req_url = server + '?apiKey=' + apikey; // + '&ip=' + ip;
  const response = await fetch(req_url);
  const data = await response.json();
  const geo_data = {
    ip: data.ip,
    continent_name: data.continent_name,
    country_name: data.country_name,
    state_prov: data.state_prov,
    district: data.district,
    city: data.city,
    zipcode: data.zipcode,
    latitude: data.latitude,
    longitude: data.longitude,
    is_eu: data.is_eu,
    isp: data.isp,
    organization: data.organization,
  };
  // console.log('Geo>', geo_data);

  const dateObj = new Date();
  const options = Intl.DateTimeFormat().resolvedOptions();

  console.log({
    version,
    os: osInfo,
    cpu: cpuInfo,
    screens,
    date: dateObj.toISOString(),
    locale: options.locale,
    timezone: options.timeZone,
    ip,
    geo: geo_data,
  });

  process.exit(0);
});

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
