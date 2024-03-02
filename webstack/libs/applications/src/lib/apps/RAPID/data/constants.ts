export const CATEGORIES = {
  CONTROL_PANEL: {
    name: 'Control Panel',
    order: 0,
  },
  GRAPH: {
    name: 'Graph',
    order: 1,
  },
  OVERVIEW: {
    name: 'Overview',
    order: 2,
  },
  MAP: {
    name: 'Map',
    order: 3,
  },
  SAGE_STATS: {
    name: 'SAGE Stats',
    order: 4,
  },
  DUMMY: {
    name: 'Dummy',
    order: 5,
  },
  DUMMY2: {
    name: 'Dummy2',
    order: 6,
  },
  DUMMY3: {
    name: 'Dummy3',
    order: 7,
  },
  DUMMY4: {
    name: 'Dummy4',
    order: 8,
  },
  DUMMY5: {
    name: 'Dummy5',
    order: 9,
  },
  DUMMY6: {
    name: 'Dummy6',
    order: 10,
  },
  DUMMY7: {
    name: 'Dummy7',
    order: 11,
  },
};

export const QUERY_FIELDS = {
  TEMPERATURE: {
    NAME: "Temperature (°C)",
    SAGE_NODE: 'env.temperature',
    MESONET: 'air_temp_set_1',
  },
  RELATIVE_HUMIDITY: {
    NAME: "Relative Humidity (%)",
    SAGE_NODE: 'env.relative_humidity',
    MESONET: 'relative_humidity_set_1',
  },
  PRESSURE: {
    NAME: "Pressure (Millibars)",
    SAGE_NODE: 'env.pressure',
    MESONET: 'pressure_set_1',
  },
  TIME: {
    "24HR": {
      SAGE_NODE: "-1d",
      MESONET: "1440"
    },
    "7D": {
      SAGE_NODE: "-7d",
      MESONET: "10080"
    },
    "30D": {
      SAGE_NODE: "-30d",
      MESONET: "40320"
    }
  }
};
