/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '@sage3/frontend';

type NLPRequestResponse = {
  success: boolean;
  message: string;
};

export type WidgetType = {
  visualizationType: string;
  yAxisNames: string[];
  xAxisNames: string[];
  color: string;
  layout: { x: number; y: number; w: number; h: number };
  operation?: string;
  startDate: string;
  endDate?: string;
  sinceInMinutes?: number;
  timePeriod: string;
};
export const checkAvailableVisualizations = (variable: string) => {
  const availableVisualizations: { value: string; name: string }[] = [];
  switch (variable) {
    case 'Elevation, Longitude, Latitude, Name, Time':
      availableVisualizations.push({ value: 'stationMetadata', name: 'Station Metadata' });
      availableVisualizations.push({ value: 'map', name: 'Map' });
      break;
    case 'Elevation & Current Temperature':
      availableVisualizations.push({ value: 'scatter', name: 'Scatter Chart' });
      break;

    default:
      availableVisualizations.push({ value: 'variableCard', name: 'Current Value (Large variable name)' });
      availableVisualizations.push({ value: 'friendlyVariableCard', name: 'Current Value (Large station name)' });
      availableVisualizations.push({ value: 'statisticCard', name: 'Current Value (With Statistics)' });
      // availableVisualizations.push({value: 'allVariables', name: 'Current Conditions'});
      availableVisualizations.push({ value: 'line', name: 'Line Chart' });
      availableVisualizations.push({ value: 'bar', name: 'Bar Chart' });
      availableVisualizations.push({ value: 'map', name: 'Map (Current Value)' });
      // availableVisualizations.push({ value: 'scatter', name: 'Scatter Chart' });
      break;
  }
  return availableVisualizations;
};

// Not used for now. TODO in future, will ask ChatGPT to generate a chart
export async function NLPHTTPRequest(message: string): Promise<NLPRequestResponse> {
  const response = await fetch(apiUrls.misc.nlp, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  return (await response.json()) as NLPRequestResponse;
}

export function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

// Get the dateTime 24 hours before
export function getFormattedDateTime24HoursBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime1WeekBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24 * 7);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime1MonthBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24 * 30);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime1YearBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24 * 365);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

type VariableInfo = {
  available_variable_names: string[];
  available_variable_ids: string[];
};

type DataAttributes = {
  attributes: string[];
  transformations: string[];
  chartType: string[];
  available_attribute_info: VariableInfo;
  dates: { startDate: string; endDate: string };
};

type StationInformationProps = {
  [key: string]: DataAttributes;
};

type RawData = {
  [attribute: string]: {
    [date: string]: any;
  };
};

const formatData = (rawData: RawData) => {
  const attributes = Object.keys(rawData);
  const dates = Object.keys(rawData[attributes[0]]);
  const data = [['Date', ...attributes]];

  dates.forEach((date) => {
    const dateString = new Date(date).toDateString();
    const dataRow = [dateString, ...attributes.map((attr) => rawData[attr][date])];
    data.push(dataRow);
  });

  return data;
};

const fetchData = async (stationName: string, attributes: string[]) => {
  //TODO change to Batchfetch to get all of the data, then select attributes that are relevant
  if (!data) return {};

  const subsetData: any = {};
  attributes.forEach((attribute) => {
    if (data.hasOwnProperty(attribute)) {
      subsetData[attribute] = data[attribute];
    }
  });

  return subsetData;
};

const filterDataByDate = (formattedData: string[][], dates: { startDate: string; endDate: string }) => {
  const { startDate, endDate } = dates;
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return formattedData.filter((row, index) => index === 0 || (new Date(row[0]).getTime() >= start && new Date(row[0]).getTime() <= end));
  } else {
    return formattedData;
  }
};

export const processStations = async (
  station_information: StationInformationProps,
  colorMode: string,
  appSize: { width: number; height: number; depth: number }
) => {
  const tmpChartOptions: EChartsCoreOption[] = [];
  const stations = Object.keys(station_information);
  const { dates, attributes: rawAttributes, chartType, transformations } = station_information[stations[0]];
  const attributes = rawAttributes.filter((attr) => attr !== 'Date');
  if (attributes.length === 0) {
    console.log('Not enough attributes found other than date');
    return [];
  }
  const tmpData = [];
  for (const stationID of stations) {
    const data = await fetchData(stationID, attributes); //TODO change this to fetch all the stations at once.
    if (Object.keys(data).length !== 0) {
      const stationName = stationData.find((station) => station.stationID === stationID)?.stationName || '';
      const formattedData = formatData(data);
      const filteredDataByDate = filterDataByDate(formattedData, dates);
      tmpData.push({ data: filteredDataByDate, stationName });
    }
  }

  if (tmpData.length == 0) return [];
  const chartOptions = generateOption({
    chartName: chartType[0],
    data: tmpData,
    attributes,
    transformations,
    colorMode,
    appSize,
  });

  return chartOptions;
};
