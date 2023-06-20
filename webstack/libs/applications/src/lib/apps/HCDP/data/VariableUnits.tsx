import hotTemp from './hot.png';
import coldTemp from './cold.png';
import neutralTemp from './neutral.png';

// Hard coded the variable units and images for now
const variableUnits: { variable: string; unit: string; images: string[] }[] = [
  {
    variable: 'air_temp',
    unit: 'C\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'dew_point_temperature',
    unit: 'C\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'elevation',
    unit: 'ft.',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'incoming_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'net_radiation',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'net_radiation_sw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'net_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'outgoing_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'outgoing_radiation_sw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'position',
    unit: 'm',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'precip_accum_five_minute',
    unit: 'mm',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'relative_humidity',
    unit: '%',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'soil_moisture',
    unit: '%',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'soil_temp',
    unit: 'C\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'solar_radiation',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'wind_direction',
    unit: '\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'wind_gust',
    unit: 'm/s',
    images: [coldTemp, neutralTemp, hotTemp],
  },
  {
    variable: 'wind_speed',
    unit: 'm/s',
    images: [coldTemp, neutralTemp, hotTemp],
  },
];

export default variableUnits;
