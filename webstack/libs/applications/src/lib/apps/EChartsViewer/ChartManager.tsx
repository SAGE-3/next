/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import type { EChartsOption } from 'echarts';

import variableUnits from '../SensorOverview/data/variableUnits';
import { useColorModeValue } from '@chakra-ui/react';
import { variable_dict } from '../SensorOverview/data/variableConversion';

//Types
type filterType = {
  attribute: string;
  operator: string;
  secondaryOperator?: string;
  reference?: string;
  upperBound?: string;
  LowerBound?: string;
};

type aggregateType = {
  xAxisAggregator: string;
  yAxisAggregator: string;
};

export const stationColors: { stationName: string; color: string }[] = [];
export const colors: string[] = ['#EA6343', '#F69637', '#FFB92E', '#60CC8D', '#60CDBA', '#5AB2D3', '#58D5D5', '#7D78B4', '#DB5296'];

// Note: Also used by SensorOverview to color the individual "Current Value" cards
// Generates a "bright" random color
// Chose "bright" because it is easier to read on a black background
export const getColor = (index: number) => {
  return colors[index];
};

// Convert to ECharts formatted dateTime
function convertToFormattedDateTime(date: Date) {
  const now = new Date(date);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

// Add type definition for measurement data
interface Measurement {
  timestamp: string;
  station_id: string;
  variable: string;
  value: string;
  flag: number;
}

interface StationData {
  [key: string]: Measurement[];
}

// Generates the options for charts
export const ChartManager = (
  stationNames: string[],
  chartType: string,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  colorMode: string,
  startDate: string,
  stationMetadata: StationData,
  timePeriod: string,
  size: { width: number; height: number; depth: number },
  variable_dict: { standard_name: string; units: string | null; units_short: string | null; display_name: string }[]
): EChartsOption => {
  let options: EChartsOption = {};
  const stationReadableNames = ['TODO', ' FIXME'];
  //
  if (yAxisAttributes[0] === 'Elevation & Current Temperature') {
    yAxisAttributes[0] = 'elevation';
    xAxisAttributes[0] = 'current temperature';
  }

  // This generates the data for charts, NOT the chart itself
  const { xAxisData, yAxisData } = createAxisData(stationMetadata, yAxisAttributes, xAxisAttributes);
  switch (chartType) {
    case 'Line Chart':
      if (Object.keys(stationMetadata).length > 1) {
        createMultiLineChart(options, stationMetadata, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      } else if (Object.keys(stationMetadata).length == 1) {
        createLineChart(options, stationMetadata, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      }
      break;
    case 'Scatter Plot':
      createScatterPlot(options, stationMetadata, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      break;
    case 'Boxplot':
      createBoxplot(options, stationMetadata, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      break;
    case 'Pie Chart':
      createPieChart(options, stationMetadata, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      break;
    // case 'Column Histogram':
    //   createColumnHistogram(options, stationMetadata, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
    //   break;
  }

  createTitle(options, yAxisAttributes, xAxisAttributes, stationReadableNames.join(', '), timePeriod, stationMetadata);
  options = customizeChart(options, colorMode);
  options.color = createColors(options, stationMetadata);

  //Next two calls generates the X and Y axis for the charts
  createXAxis(options, xAxisAttributes, xAxisData, chartType, size);
  createYAxis(options, yAxisAttributes);
  createGrid(options);
  createTooltip(options, colorMode);

  return options;
};

const createTooltip = (options: EChartsOption, colorMode: string) => {
  options.tooltip = {
    show: true,
    trigger: 'axis',
    textStyle: {
      fontSize: 40,
      color: colorMode === 'dark' ? '#fff' : '#000',
    },
    borderWidth: 3,
    backgroundColor: colorMode === 'dark' ? '#555' : '#fff',
  };
};

const createGrid = (options: EChartsOption) => {
  options.grid = {
    left: '5%',
    right: '5%',
    bottom: '12%',
    // Leave enough space at the top for the title and legend
    top: '20%',
    containLabel: true,
  };
};

const createXAxis = (
  options: EChartsOption,
  xAxisAttributes: string[],
  xAxisData: any[],
  chartType: string,
  size: { width: number; height: number; depth: number }
) => {
  const interval = Math.floor((250 / size.width) * xAxisData.length);
  if (chartType == 'scatter') {
    options.xAxis = {
      axisLabel: {
        fontSize: 25,
        margin: 25,
      },
      min: 'dataMin',
    };
  } else {
    options.xAxis = {
      data: xAxisData,
      name: xAxisAttributes[0],
      nameLocation: 'middle',
      nameTextStyle: {
        fontSize: 40, // Increase the font size here
        fontWeight: 'bold', // Customize the style of the title (optional)
      },
      axisLabel: {
        fontSize: 35,
        margin: 25,
        interval: interval,
        rotate: 30,
      },
      nameGap: 300,
    };
  }
};

const createYAxis = (options: EChartsOption, yAxisAttributes: string[]) => {
  let units: string | null = '';
  let variableName: string | null = '';

  for (let i = 0; i < variable_dict.length; i++) {
    if (variable_dict[i].standard_name == yAxisAttributes[0]) {
      variableName = variable_dict[i].display_name;
      units = variable_dict[i].units;
      break;
    }
  }

  options.yAxis = {
    name: `${variableName} ${units === null ? '' : `(${units})`}`,
    nameTextStyle: {
      fontSize: 40,
      fontWeight: 'bold',
      padding: [0, 0, 0, 300],
    },
    nameGap: 75,
    type: 'value',
    axisLabel: {
      fontSize: 40,
    },
    min: 'dataMin',
  };
};

const createColors = (options: EChartsOption, data: StationData) => {
  const colors: string[] = [];
  Object.keys(data).forEach((stationId, index) => {
    if (data[stationId].length > 0) {
      colors.push(getColor(index % 9)); // Use modulo to cycle through the 9 available colors
    }
  });
  return colors;
};

function createMultiLineChart(
  options: EChartsOption,
  data: StationData,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: (number | null)[][],
  xAxisData: string[]
) {
  // Initialize series as an array
  const series: any[] = [];

  // Create a series for each station
  Object.entries(data).forEach(([stationId, measurements], index) => {
    if (!Array.isArray(measurements) || measurements.length === 0) return;

    series.push({
      name: `Station ${stationId}`,
      type: 'line',
      lineStyle: {
        width: 3,
      },
      data: yAxisData[index],
      connectNulls: true, // This will connect points even if there are gaps
    });
  });

  // Assign the complete series array to options
  options.series = series;

  options.legend = {
    data: Object.keys(data)
      .filter((stationId) => Array.isArray(data[stationId]) && data[stationId].length > 0)
      .map((id) => `Station ${id}`),
    textStyle: {
      fontSize: 32,
      lineHeight: -20,
    },
    top: 70,
    left: 'center',
  };
}

function createLineChart(
  options: EChartsOption,
  data: any,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: any[],
  xAxisData: any[]
) {
  options.series = [];
  console.log(yAxisData);
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'line',
      data: yAxisData[i],
      name: yAxisAttributes[0],

      lineStyle: {
        width: 3,
      },
      // markArea: {
      //   silent: true,
      //   itemStyle: {
      //     opacity: 0.3,
      //   },
      //   data: [
      //     [
      //       {
      //         xAxis: xAxisData[xAxisData.length / 2],
      //       },
      //       {
      //         xAxis: xAxisData[xAxisData.length - 1],
      //       },
      //     ],
      //   ],
      // },
    });
  }
  // options.dataZoom = [
  //   {
  //     show: true,
  //     realtime: true,
  //     start: 0,
  //     end: xAxisData.length - 1,
  //   },
  //   {
  //     type: 'inside',
  //     realtime: true,
  //     start: 0,
  //     end: xAxisData.length - 1,
  //   },
  // ];
}

function createScatterPlot(
  options: EChartsOption,
  data: any,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: any[],
  xAxisData: any[]
) {
  for (let i = 0; i < data.length; i++) {
    xAxisData.push({ value: data[i].OBSERVATIONS[xAxisAttributes[0]], name: data[i].NAME });
    yAxisData.push(data[i].OBSERVATIONS[yAxisAttributes[0]]);
  }
  options.series = [];

  // options.legend = {
  //   top: '60px',
  //   data: [],
  // };
  for (let i = 0; i < xAxisData.length; i++) {
    options.series.push({
      type: 'scatter',
      name: xAxisData[i].name ? xAxisData[i].name : 'unknown',
      symbolSize: 30,
      data: [[xAxisData[i].value, yAxisData[i]]],
      label: { show: true, fontSize: 30, position: 'right', color: 'white', formatter: xAxisData[i].name ? xAxisData[i].name : 'unknown' },
    });
    // options.legend.data?.push(xAxisData[i].name ? xAxisData[i].name : 'unknown');
  }
}

function createTitle(
  options: EChartsOption,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  stationName: string,
  timePeriod: string,
  data: StationData
) {
  let variableName = '';
  for (const [stationId, measurements] of Object.entries(data)) {
    if (Array.isArray(measurements) && measurements.length > 0) {
      // Clean up variable name (remove _Min, _Max, _Avg suffix)
      break;
    }
  }
  for (let i = 0; i < variable_dict.length; i++) {
    if (variable_dict[i].standard_name == yAxisAttributes[0]) {
      variableName = variable_dict[i].display_name;
    }
  }

  options.title = {
    text: `${variableName} versus Time`,
    textStyle: {
      fontSize: 40,
    },
    left: 'center',
  };
}

function createBoxplot(
  options: EChartsOption,
  data: any,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: any[],
  xAxisData: any[]
) {
  options.series = [];
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'boxplot',
      data: yAxisData[i],
      name: yAxisAttributes[0],
      boxWidth: [30, 30],
      itemStyle: {
        borderWidth: 1,
        borderColor: 'black',
      },
      markLine: {
        silent: true,
        data: [
          {
            xAxis: xAxisData[xAxisData.length / 2],
          },
          {
            xAxis: xAxisData[xAxisData.length - 1],
          },
        ],
      },
    });
  }
}

function createPieChart(
  options: EChartsOption,
  data: any,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: any[],
  xAxisData: any[]
) {
  options.series = [];
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'pie',
      data: yAxisData[i],
      name: yAxisAttributes[0],
      radius: '50%',
      label: { show: true, fontSize: 20 },
    });
  }
}

function createColumnHistogram(
  options: EChartsOption,
  data: any,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: any[],
  xAxisData: any[]
) {
  options.series = [];
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'bar',
      data: yAxisData[i],
      name: yAxisAttributes[0],
      barWidth: 30,
      barGap: '10%',
      itemStyle: {
        borderWidth: 1,
        borderColor: 'black',
      },
    });
  }
}

const formatDate = (date: Date) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayOfWeek = daysOfWeek[date.getDay()];
  const month = months[date.getMonth()];

  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12 for the 12-hour clock

  const formattedDate =
    dayOfWeek +
    ', ' +
    month +
    ' ' +
    ('0' + date.getDate()).slice(-2) +
    ', ' +
    date.getFullYear() +
    ' ' +
    ('0' + hours).slice(-2) +
    ':' +
    ('0' + date.getMinutes()).slice(-2) +
    ' ' +
    ampm;

  return formattedDate;
};

const createAxisData = (data: StationData, yAxisAttributes: string[], xAxisAttributes: string[]) => {
  let yAxisData: (number | null)[][] = [];
  let xAxisData: string[] = [];
  let allTimestamps = new Set<string>();

  // First, collect all unique timestamps
  Object.entries(data).forEach(([stationId, measurements]) => {
    if (!Array.isArray(measurements) || measurements.length === 0) return;
    measurements.forEach((measurement) => {
      allTimestamps.add(formatDate(new Date(measurement.timestamp)));
    });
  });

  // Convert to sorted array
  xAxisData = Array.from(allTimestamps).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Create data series for each station
  Object.entries(data).forEach(([stationId, measurements]) => {
    if (!Array.isArray(measurements) || measurements.length === 0) return;

    // Create a map of timestamp to value for this station
    const timestampMap = new Map<string, number>();
    measurements.forEach((measurement) => {
      timestampMap.set(formatDate(new Date(measurement.timestamp)), parseFloat(measurement.value));
    });

    // Create the data array for this station, matching the xAxisData timestamps
    const stationData = xAxisData.map((timestamp) => (timestampMap.has(timestamp) ? timestampMap.get(timestamp)! : null));

    yAxisData.push(stationData);
  });

  return { xAxisData, yAxisData };
};

function customizeChart(options: EChartsOption, colorMode: string) {
  // Set the color mode
  if (colorMode === 'dark') {
    options.backgroundColor = '#222';
    options.textStyle = { color: '#ffffff' };
    options.axisLine = { lineStyle: { color: '#eee' } };
    options.tooltip = { backgroundColor: '#333', textStyle: { color: '#eee' } };
  } else if (colorMode === 'light') {
    options.backgroundColor = '#fff';
    options.textStyle = { color: '#333' };
    options.axisLine = { lineStyle: { color: '#999' } };
    options.tooltip = { backgroundColor: '#fff', textStyle: { color: '#333' } };
  } else {
    throw new Error('Invalid color mode');
  }

  // Return the modified options object
  return options;
}
