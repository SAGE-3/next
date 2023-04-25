/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { specialTypes } from './findHeaderType';

// Check data types in dataset to mark if charts are available or not available
export default function (
  input: string,
  data: any[]
): {
  key: string;
  mark: string;
  available: boolean;
}[] {
  let availableCharts = [
    {
      key: 'bar',
      mark: 'bar',
      available: false,
    },
    {
      key: 'histogram',
      mark: 'histogram',
      available: false,
    },

    {
      key: 'line',
      mark: 'line',
      available: false,
    },
    {
      key: 'heat map',
      mark: 'heatmap',
      available: false,
    },
    {
      key: 'heatmap',
      mark: 'heatmap',
      available: false,
    },
    {
      key: 'map',
      mark: 'map',
      available: false,
    },
    {
      key: 'parallel coordinates',
      mark: 'parallelCoordinates',
      available: false,
    },
    {
      key: 'point',
      mark: 'point',
      available: false,
    },
    {
      key: 'bubble',
      mark: 'point',
      available: false,
    },
  ];
  // Checker for each data type in dataset
  let typesInDataset = {
    temporal: false,
    nominal: false,
    quantitative: false,
    map: false,
  };

  // Iterate over data types to mark if present in dataset
  let keys: any[] = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    for (let i = 0; i < specialTypes.length; i++) {
      if (keys[i] === specialTypes[i].header) {
        typesInDataset.map = true;
        break;
      }
    }
    let lowerCaseHeader = keys[i].toLowerCase();
    if (
      lowerCaseHeader.includes('date') ||
      lowerCaseHeader.includes('year') ||
      lowerCaseHeader.includes('month') ||
      lowerCaseHeader.includes('day') ||
      lowerCaseHeader.includes('months') ||
      lowerCaseHeader.includes('dates')
    ) {
      typesInDataset.temporal = true;
    } else if (isNaN(data[keys[i]])) {
      typesInDataset.nominal = true;
    } else {
      typesInDataset.quantitative = true;
    }
  }

  // helper function to mark chart types as available
  function switchAvailableCharts(type: string) {
    for (let i = 0; i < availableCharts.length; i++) {
      if (availableCharts[i].mark === type) {
        availableCharts[i].available = true;
      }
    }
  }

  // If certain data types are present in dataset,
  // Should be able to generate these charts
  if (typesInDataset.temporal && typesInDataset.quantitative) {
    switchAvailableCharts('line');
  }
  if (typesInDataset.quantitative && typesInDataset.nominal) {
    switchAvailableCharts('bar');
    switchAvailableCharts('point');
    switchAvailableCharts('heatmap');
  }
  if (typesInDataset.map && typesInDataset.nominal) {
    switchAvailableCharts('map');
  }
  if (typesInDataset.nominal) {
    switchAvailableCharts('histogram');
  }
  return availableCharts;
}
