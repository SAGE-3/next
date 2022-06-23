/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

export const SAGEColors = [
  {
    name: 'red',
    value: '#FC8181',
  },
  {
    name: 'orange',
    value: '#F6AD55',
  },
  {
    name: 'yellow',
    value: '#F6E05E',
  },
  {
    name: 'green',
    value: '#68D391',
  },
  {
    name: 'teal',
    value: '#4FD1C5',
  },
  {
    name: 'blue',
    value: '#63b3ed',
  },
  {
    name: 'cyan',
    value: '#76E4F7',
  },
  {
    name: 'purple',
    value: '#B794F4',
  },
  {
    name: 'pink',
    value: '#F687B3',
  },
];

export function randomSAGEColor() {
  return SAGEColors[Math.floor(Math.random() * SAGEColors.length)];
}

export function sageColorByName(name: string) {
  const color = SAGEColors.find(el => el.name === name);
  return (color) ? color.value : '#FFFFFFF';
}