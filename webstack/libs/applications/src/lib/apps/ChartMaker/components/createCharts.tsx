import createBarChart, { barChartProps } from './chartTemplates/createBarChart';
import createLineChart, { lineChartProps } from './chartTemplates/createLineChart';
import createHeatmap, { heatmapProps } from './chartTemplates/createHeatmap';
import createMapChart, { mapChartProps } from './chartTemplates/createMapChart';
import findHeaderType, { specialTypes } from './findHeaderType';
import extractFilters from './extractFilters';
import extractHeaders from './extractHeaders';
import normalizeCommand from './normalizeCommand';
import extractChartType from './extractChartType';
import createPropertyList from './createPropertyList';
import createAvailableChartTypes from './createAvailableChartTypes';
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
  const extractedFilterValues = extractFilters(input, propertyList);
  let extractedChartType = extractChartType(input, availableCharts);
  let specifications: barChartProps[] | lineChartProps[] | heatmapProps[] | mapChartProps[] = [];

  if (extractedChartType == '') {
    input = normalizeCommand(input, propertyList, data);
    const message = await NLPHTTPRequest(input);
    extractedChartType = message.message;
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
  } else {
    throw 'Try adding a chart type to your query. (Ex: bar, line, heatmap)';
  }

  // For each data visualizations, generate title and filters
  for (let i = 0; i < specifications.length; i++) {
    specifications[i].title = createTitle(extractedHeaders, extractedChartType, extractedFilterValues);
    specifications[i].transform = createTransform(extractedFilterValues, propertyList);

    // if (specifications[i].hasOwnProperty('transform')) {
    // }
    // if (extractedChartType == 'map') {
    //   specifications[i].layer[1] = createTransform(extractedFilterValues, propertyList);
    // } else {
    // }
  }

  return specifications;
};
