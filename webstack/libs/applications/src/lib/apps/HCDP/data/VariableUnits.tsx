import hotTemp from './hot.png';
import coldTemp from './cold.png';
import neutralTemp from './neutral.png';

// Hard coded the variable units and images for now
const variableUnits: { variable: string; unit: string; images: string[]; color: string }[] = [
  {
    variable: 'air_temp',
    unit: 'C\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#a6cee3',
  },
  {
    variable: 'dew_point_temperature',
    unit: 'C\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#a6cee3',
  },
  {
    variable: 'elevation',
    unit: 'ft.',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#b2df8a',
  },
  {
    variable: 'incoming_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'net_radiation',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'net_radiation_sw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'net_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'outgoing_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'outgoing_radiation_sw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'position',
    unit: 'm',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#33a02c',
  },
  {
    variable: 'precip_accum_five_minute',
    unit: 'mm',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#fb9a99',
  },
  {
    variable: 'relative_humidity',
    unit: '%',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#e31a1c',
  },
  {
    variable: 'soil_moisture',
    unit: '%',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#fdbf6f',
  },
  {
    variable: 'soil_temp',
    unit: 'C\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#a6cee3',
  },
  {
    variable: 'solar_radiation',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#1f78b4',
  },
  {
    variable: 'wind_direction',
    unit: '\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#ff7f00',
  },
  {
    variable: 'wind_gust',
    unit: 'm/s',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#ff7f00',
  },
  {
    variable: 'wind_speed',
    unit: 'm/s',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#ff7f00',
  },
];

export default variableUnits;
