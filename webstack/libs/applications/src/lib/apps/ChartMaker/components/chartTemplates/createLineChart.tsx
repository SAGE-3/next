/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '@sage3/frontend';

import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

export interface lineChartProps {
  description: string;
  title: string;
  data: { url: string };
  mark: string;
  encoding: {
    x: { field: string; type: string };
    y: { field: string; type: string; aggregate: string };
    color?: { field: string };
  };
  layer?: any[];
  transform: any[];
}

export default function createLineChart(extractedHeaders: string[], fileName: string, data: string[]) {
  let lineChartSpec: lineChartProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    mark: 'line',
    encoding: {
      x: { field: '', type: '' },
      y: { field: '', type: '', aggregate: '' },
    },
    transform: [] as any,
  };
  let specifications = [];
  extractedHeaders = organizeLineChartHeaders(extractedHeaders, data);

  if (extractedHeaders.length == 2) {
    lineChartSpec.data.url = apiUrls.assets.getAssetById(fileName);

    lineChartSpec.encoding.x.field = extractedHeaders[1];
    lineChartSpec.encoding.x.type = 'temporal';

    lineChartSpec.encoding.y.field = extractedHeaders[0];
    lineChartSpec.encoding.y.type = 'quantitative';
    lineChartSpec.encoding.y.aggregate = 'sum';
    specifications.push(lineChartSpec);
  } else if (extractedHeaders.length == 3) {
    lineChartSpec.data.url = apiUrls.assets.getAssetById(fileName);
    lineChartSpec.encoding.x.field = extractedHeaders[1];
    lineChartSpec.encoding.x.type = 'nominal';

    lineChartSpec.encoding.y.field = extractedHeaders[0];
    lineChartSpec.encoding.y.type = 'quantitative';
    lineChartSpec.encoding.y.aggregate = 'sum';
    lineChartSpec.encoding.color = { field: extractedHeaders[2] };
    specifications.push(lineChartSpec);
  }

  return specifications;
}

// Will put headers in this order
// [quantitative, temporal, nominal, nominal, nominal....]
function organizeLineChartHeaders(extractedHeaders: string[], data: string[]) {
  let quantitativeFound = false;
  let temporalFound = false;
  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'quantitative') {
      switchHeaders(extractedHeaders, 0, i);
      quantitativeFound = true;
    }
  }
  for (let i = 1; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'temporal') {
      switchHeaders(extractedHeaders, 1, i);
      temporalFound = true;
    }
  }

  // Automatically look for Quantitative data type
  if (!quantitativeFound) {
    const headers = Object.keys(data);

    for (let i = 0; i < headers.length; i++) {
      if (findHeaderType(headers[i], data) === 'quantitative') {
        extractedHeaders.unshift(headers[i]);
        quantitativeFound = true;
        break;
      }
    }
  }
  if (!temporalFound) {
    const headers = Object.keys(data);

    for (let i = 0; i < headers.length; i++) {
      if (findHeaderType(headers[i], data) === 'temporal') {
        extractedHeaders.splice(1, 0, headers[i]);
        temporalFound = true;
        break;
      }
    }
  }

  if (quantitativeFound && temporalFound) {
    return extractedHeaders;
  } else {
    throw 'You did not provide enough details to generate a chart';
  }
}
