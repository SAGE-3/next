/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

export interface heatmapProps {
  description: string;
  title: string;
  data: { url: string };
  mark: string;
  encoding: {
    x: { field: string; type: string };
    y: { field: string; type: string };
    color?: { aggregate: string; type: string };
  };
  layer?: any[];
  transform: any[];
}

export default function createHeatmap(extractedHeaders: string[], fileName: string, data: string[]) {
  let lineChartSpec: heatmapProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    mark: 'rect',
    encoding: {
      x: { field: '', type: '' },
      y: { field: '', type: '' },
      color: { aggregate: '', type: '' },
    },
    transform: [] as any,
  };
  let specifications = [];
  extractedHeaders = organizeHeatmapHeaders(extractedHeaders, data);

  lineChartSpec.data.url = apiUrls.assets.getAssetById(fileName);
  lineChartSpec.encoding.x.field = extractedHeaders[1];
  lineChartSpec.encoding.x.type = findHeaderType(extractedHeaders[1], data);

  lineChartSpec.encoding.y.field = extractedHeaders[0];
  lineChartSpec.encoding.y.type = findHeaderType(extractedHeaders[0], data);

  lineChartSpec.encoding.color = { aggregate: 'count', type: 'quantitative' };
  specifications.push(lineChartSpec);

  return specifications;
}

// Will put headers in this order
// [nominal, nominal, nominal....]
function organizeHeatmapHeaders(extractedHeaders: string[], data: string[]) {
  let nominalCount = 0;
  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) !== 'nominal') {
      extractedHeaders.splice(i, 1);
    } else {
      nominalCount++;
    }
  }
  if (nominalCount < 2) {
    throw 'You did not provide enough details to generate a chart';
  } else {
    return extractedHeaders;
  }
  // } else {
  //   throw 'Underspecified';
  // }
}
