export const CATEGORIES = {
  CONTROL_PANEL: 'Control Panel',
  GRAPH: 'Graph',
  OVERVIEW: 'Overview',
  MAP: 'Map',
  SAGE_STATS: 'Sage Stats',
};

export const QUERY_FIELDS = {
  TEMPERATURE: {
    NAME: 'Temperature (°C)',
    SAGE_NODE: 'env.temperature',
    MESONET: 'air_temp_set_1',
  },
  RELATIVE_HUMIDITY: {
    NAME: 'Relative Humidity (%)',
    SAGE_NODE: 'env.relative_humidity',
    MESONET: 'relative_humidity_set_1',
  },
  PRESSURE: {
    NAME: 'Pressure (Millibars)',
    SAGE_NODE: 'env.pressure',
    MESONET: 'pressure_set_1',
  },
  TIME: {
    '24HR': {
      SAGE_NODE: '-1d',
      MESONET: '1440',
    },
    '7D': {
      SAGE_NODE: '-7d',
      MESONET: '10080',
    },
    '30D': {
      SAGE_NODE: '-30d',
      MESONET: '40320',
    },
  },
};

// Currently hardcoded. Argonne does not have a public API that we can use to fetch all sensors.
export const SAGE_SENSORS = [
  {
    id: 'W097',
    name: 'Volcano National Park',
    lat: 19.415121313,
    lon: -155.238433559
  },
];

// Metrics of interest from Waggle Node
export const SAGE_METRICS = {
  "Temperature (°C)": "env.temperature",
  "Relative Humidity (%)": "env.relative_humidity",
  "Pressure (Millibars)": "env.pressure",
  "Rainfall (mm)": "env.raingauge.event_acc",
  "CPU Load (%)": "sys.freq.cpu_perc",
  "GPU Load (%)": "sys.freq.gpu"
}

// Metrics shared between Waggle Node and Mesonet
export const SHARED_METRICS = {
  TEMPERATURE: {
    NAME: 'Temperature (°C)',
    SAGE_NODE: 'env.temperature',
    MESONET: 'air_temp_set_1',
  },
  RELATIVE_HUMIDITY: {
    NAME: 'Relative Humidity (%)',
    SAGE_NODE: 'env.relative_humidity',
    MESONET: 'relative_humidity_set_1',
  },
  PRESSURE: {
    NAME: 'Pressure (Millibars)',
    SAGE_NODE: 'env.pressure',
    MESONET: 'pressure_set_1',
  },
}