export const CATEGORIES = {
  CONTROL_PANEL: 'Control Panel',
  GRAPH: 'Line Graph',
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
    lon: -155.238433559,
  },
  {
    id: 'W069',
    name: 'Lahaina',
    lat: 20.890681042619217,
    lon: -156.65474422852128,
  },
  {
    id: 'W071',
    name: 'Waikalua Loko Fish Pond',
    lat: 21.41130215,
    lon: -157.7842519,
  },
];

export interface WaggleMetrics {
  'Temperature (°C)': string;
  'Relative Humidity (%)': string;
  'Pressure (Millibars)': string;
  'Rainfall (mm)': string;
  'CPU Load (%)': string;
  'GPU Load (%)': string;
}

// Metrics of interest from Waggle Node
export const WAGGLE_METRICS: WaggleMetrics = {
  'Temperature (°C)': 'env.temperature',
  'Relative Humidity (%)': 'env.relative_humidity',
  'Pressure (Millibars)': 'env.pressure',
  'Rainfall (mm)': 'env.raingauge.event_acc',
  'CPU Load (%)': 'sys.freq.cpu_perc',
  'GPU Load (%)': 'sys.freq.gpu',
};

// ! Temporarily here. Will use an endpoint in the future.
export interface MesonetMetrics {
  'Temperature (°C)': string;
  'Relative Humidity (%)': string;
  'Pressure (Millibars)': string;
}

export const MESONET_METRICS: MesonetMetrics = {
  'Temperature (°C)': 'air_temp_set_1',
  'Relative Humidity (%)': 'relative_humidity_set_1',
  'Pressure (Millibars)': 'pressure_set_1',
};

export interface Metric {
  name: string;
  waggle: string;
  mesonet: string | null;
}

export const METRICS: Metric[] = [
  {
    name: 'Temperature (°C)',
    waggle: 'env.temperature',
    mesonet: 'air_temp_set_1',
  },
  {
    name: 'Relative Humidity (%)',
    waggle: 'env.relative_humidity',
    mesonet: 'relative_humidity_set_1',
  },
  {
    name: 'Pressure (Millibars)',
    waggle: 'env.pressure',
    mesonet: 'pressure_set_1',
  },
  {
    name: 'Event Accumulated Rainfall (mm)',
    waggle: 'env.raingauge.event_acc',
    mesonet: null,
  },
  {
    name: 'Total Accumulated Rainfall (mm)',
    waggle: 'env.raingauge.total_acc',
    mesonet: null,
  },
  {
    name: 'Rain Intensity (mm/hr)',
    waggle: 'env.raingauge.rint',
    mesonet: null,
  },
  {
    name: 'Wind Direction (°)',
    waggle: 'wxt.wind.direction',
    mesonet: 'wind_direction_set_1',
  },
  {
    name: 'Wind Speed (km/hr)',
    waggle: 'wxt.wind.speed',
    mesonet: 'wind_speed_set_1',
  },
  {
    name: 'CPU Load (%)',
    waggle: 'sys.freq.cpu_perc',
    mesonet: null,
  },
  {
    name: 'GPU Load (%)',
    waggle: 'sys.freq.gpu',
    mesonet: null,
  },
];

export const BME_680_METRICS = ['env.temperature', 'env.relative_humidity', 'env.pressure'];
