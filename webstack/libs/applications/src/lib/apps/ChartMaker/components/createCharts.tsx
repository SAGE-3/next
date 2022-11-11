/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import createBarChart, { barChartProps } from './chartTemplates/createBarChart';
import createLineChart, { lineChartProps } from './chartTemplates/createLineChart';
import createHeatmap, { heatmapProps } from './chartTemplates/createHeatmap';
import createMapChart, { mapChartProps } from './chartTemplates/createMapChart';
import createPointChart, { pointChartProps } from './chartTemplates/createPointChart';
import findHeaderType, { specialTypes } from './findHeaderType';
import extractFilters from './extractFilters';
import extractHeaders from './extractHeaders';
import normalizeCommand from './normalizeCommand';
import extractChartType from './extractChartType';
import createPropertyList from './createPropertyList';
import createAvailableChartTypes from './createAvailableChartTypes';
import inferChartType from './inferChartType';
import createTitle from './chartTemplates/createTitle';
import createTransform from './chartTemplates/createTransform';
import { NLPHTTPRequest } from '../ChartMaker';

export const createCharts = async (
  input: string,
  data: string[],
  headers: string[],
  fileName: string,
  propertyList: { header: string; filterValues: string[]; headerType: string }[]
) => {
  input = input.toLowerCase();
  const availableCharts = createAvailableChartTypes(input, data);

  const extractedHeaders = extractHeaders(input, headers);
  if (extractedHeaders.length == 0) {
    throw 'Try using attributes in your query.';
  }

  const extractedFilterValues = extractFilters(input, propertyList);
  let extractedChartType = extractChartType(input, availableCharts);
  let specifications: barChartProps[] | lineChartProps[] | heatmapProps[] | mapChartProps[] | pointChartProps[] = [];
  if (extractedChartType == '') {
    input = normalizeCommand(input, propertyList, data);
    const message = await NLPHTTPRequest(input);
    let visualizationTask = message.message;
    extractedChartType = inferChartType(visualizationTask, extractedHeaders, data);
    input += ' ' + extractedChartType;
    extractedChartType = extractChartType(input, availableCharts);
    if (extractedChartType == '') {
      extractedChartType = availableCharts[Math.floor(Math.random() * availableCharts.length)].mark;
    }
  }
  //Create Data Visualizations
  if (extractedChartType == 'bar') {
    specifications = createBarChart(extractedHeaders, fileName, data);
  } else if (extractedChartType == 'line') {
    specifications = createLineChart(extractedHeaders, fileName, data);
  } else if (extractedChartType == 'heatmap') {
    specifications = createHeatmap(extractedHeaders, fileName, data);
  } else if (extractedChartType == 'map') {
    specifications = createMapChart(extractedHeaders, fileName, data);
  } else if (extractedChartType == 'point') {
    specifications = createPointChart(extractedHeaders, fileName, data);
  } else {
    throw 'Try adding a chart type to your query. (Ex: bar, line, heatmap)';
  }

  // For each data visualizations, generate title and filters
  for (let i = 0; i < specifications.length; i++) {
    specifications[i].title = createTitle(extractedHeaders, extractedChartType, extractedFilterValues);
    // specifications[i].transform = createTransform(extractedFilterValues, propertyList);
    if (extractedChartType == 'map') {
      // specifications[i].transform = createTransform(extractedFilterValues, propertyList);
      // delete specifications[i].transform;
    } else {
      specifications[i].transform = createTransform(extractedFilterValues, propertyList);
    }
    // if (specifications[i].hasOwnProperty('transform')) {
    // }
    // if (extractedChartType == 'map') {
    //   specifications[i].layer[1] = createTransform(extractedFilterValues, propertyList);
    // } else {
    // }
  }

  return specifications;
};
