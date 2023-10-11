/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import hotTemp from './hot.png';
import coldTemp from './cold.png';
import neutralTemp from './neutral.png';

// Hard coded the variable units and images for now
const variableUnits: { variable: string; unit: string; images: string[]; color: string }[] = [
  {
    variable: 'air_temp',
    unit: '\u00B0C',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#E95A41',
  },
  {
    variable: 'dew_point_temperature',
    unit: '\u00B0C',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#E95A41',
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
    color: '#F8F4A6',
  },
  {
    variable: 'net_radiation',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#E4924A',
  },
  {
    variable: 'net_radiation_sw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#BDF7B7',
  },
  {
    variable: 'net_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#4F5BDD',
  },
  {
    variable: 'outgoing_radiation_lw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#C6D8AF',
  },
  {
    variable: 'outgoing_radiation_sw',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#DBD8B3',
  },
  {
    variable: 'position',
    unit: 'm',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#FCC8B2',
  },
  {
    variable: 'precip_accum_five_minute',
    unit: 'mm',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#EFA48B',
  },
  {
    variable: 'relative_humidity',
    unit: '%',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#685369',
  },
  {
    variable: 'soil_moisture',
    unit: '%',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#E8E1EF',
  },
  {
    variable: 'soil_temp',
    unit: '\u00B0C',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#D9FFF8',
  },
  {
    variable: 'solar_radiation',
    unit: 'W/m\u00B2',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#C7FFDA',
  },
  {
    variable: 'wind_direction',
    unit: '\u00B0',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#C4F4C7',
  },
  {
    variable: 'wind_gust',
    unit: 'm/s',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#9BB291',
  },
  {
    variable: 'wind_speed',
    unit: 'm/s',
    images: [coldTemp, neutralTemp, hotTemp],
    color: '#679289',
  },
];

export default variableUnits;
