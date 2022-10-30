import createBarChart, { barChartProps } from './chartTemplates/createBarChart';
import createLineChart, { lineChartProps } from './chartTemplates/createLineChart';
import findHeaderType, { specialTypes } from './findHeaderType';
import extractFilters from './extractFilters';
import extractHeaders from './extractHeaders';
import extractChartType from './extractChartType';
import createPropertyList from './createPropertyList';
import createAvailableChartTypes from './createAvailableChartTypes';
import createTitle from './chartTemplates/createTitle';
import createTransform from './chartTemplates/createTransform';

export const createCharts = (input: string, data: Record<string, string>[], headers: string[], fileName: string) => {
  input = input.toLowerCase();
  const propertyList = createPropertyList(data, headers);
  const availableCharts = createAvailableChartTypes(input, data);

  const extractedHeaders = extractHeaders(input, headers);
  const extractedFilterValues = extractFilters(input, propertyList);
  const extractedChartType = extractChartType(input, availableCharts);
  let specifications: barChartProps[] | lineChartProps[] = [];
  //Create Data Visualizations
  if (extractedChartType == 'bar') {
    specifications = createBarChart(extractedHeaders, fileName, data);
  } else if (extractedChartType == 'line') {
    specifications = createLineChart(extractedHeaders, fileName, data);
  }
  for (let i = 0; i < specifications.length; i++) {
    specifications[i].title = createTitle(extractedHeaders, 'bar', extractedFilterValues);
    specifications[i].transform = createTransform(extractedFilterValues, propertyList);
  }

  return specifications;
};
