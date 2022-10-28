import createBarChart from './chartTemplates/createBarChart';
import findHeaderType, { specialTypes } from './findHeaderType';
import extractFilters from './extractFilters';
import extractHeaders from './extractHeaders';
import extractChartType from './extractChartType';
import createPropertyList from './createPropertyList';
import createAvailableChartTypes from './createAvailableChartTypes';

export const createCharts = (input: string, data: Record<string, string>[], headers: string[], fileName: string) => {
  input = input.toLowerCase();
  const propertyList = createPropertyList(data, headers);
  const availableCharts = createAvailableChartTypes(input, data);

  const extractedHeaders = extractHeaders(input, headers);
  const extractedFilterValues = extractFilters(input, propertyList);
  const extractedChartType = extractChartType(input, availableCharts);
  let specification = createBarChart(extractedHeaders, data, fileName);

  return specification;
};
