/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import findHeaderType from './findHeaderType';

export default function inferChartType(visualizationTask: string, extractedHeaders: string[], data: string[]): string {
  switch (visualizationTask) {
    case 'extremum':
      return 'bar';
    case 'distribution':
      return 'bar';
    case 'cluster':
      return 'bar';
    case 'anomoly':
      return 'point';
    case 'correlation':
      if (findHeaderType(extractedHeaders[0], data) == 'nominal') {
        return 'heatmap';
      } else {
        return 'point';
      }
    case 'value':
      // return 'table';
      return 'bar';

    case 'trend':
      return 'line';
    default:
      return 'bar';
  }
  return '';
}
