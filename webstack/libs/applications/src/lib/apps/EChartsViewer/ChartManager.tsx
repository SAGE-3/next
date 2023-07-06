import type { EChartsOption } from 'echarts';

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

// Generates the options for charts
export const ChartManager = async (
  stationNames: string[],
  chartType: string,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  colorMode: string,
  startDate: string,
  stationMetadata?: any,
  transform?: (filterType | aggregateType)[]
): Promise<EChartsOption> => {
  let options: EChartsOption = {};
  let data = [];
  const stationReadableNames = [];

  // If higher component already has data, use that date
  // Otherwise, it is undefined, so fetch the data
  if (stationMetadata === undefined) {
    // fetch all stations
    const response = await fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
        stationNames
      )}&showemptystations=1&start=${startDate}&end=${convertToFormattedDateTime(
        new Date()
      )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    );
    const sensor = await response.json();
    data = sensor['STATION'];

    // Create a list of station names
    for (let i = 0; i < data.length; i++) {
      stationReadableNames.push(data[i].NAME);
    }
  } else {
    data = stationMetadata;
    for (let i = 0; i < stationMetadata.length; i++) {
      stationReadableNames.push(stationMetadata[i].NAME);
    }
  }

  // These attributes are not in the data, so add them
  // They are single values for each station, rather than multiple values
  for (let i = 0; i < data.length; i++) {
    data[i].OBSERVATIONS['elevation'] = [data[i].ELEVATION];
    data[i].OBSERVATIONS['latitude'] = [data[i].LATITUDE];
    data[i].OBSERVATIONS['longitude'] = [data[i].LONGITUDE];
    data[i].OBSERVATIONS['name'] = [data[i].NAME];
    data[i].OBSERVATIONS['current temperature'] = [
      data[i].OBSERVATIONS['air_temp_set_1'][data[i].OBSERVATIONS['air_temp_set_1'].length - 1],
    ];
  }

  // This generates the data for charts, NOT the chart itself
  const { xAxisData, yAxisData } = createAxisData(data, yAxisAttributes, xAxisAttributes);

  switch (chartType) {
    case 'line':
      if (data.length > 1) {
        createMultiLineChart(options, data, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      } else if (data.length == 1) {
        createLineChart(options, data, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      }
      break;
    case 'bar':
      createBarChart(options, data, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      break;
    case 'scatter':
      createScatterPlot(options, data, yAxisAttributes, xAxisAttributes, yAxisData, xAxisData);
      break;
  }

  createTitle(options, yAxisAttributes, xAxisAttributes, stationReadableNames.join(', '));
  options = customizeChart(options, colorMode);
  options.color = createColors(options, data);

  //Next two calls generates the X and Y axis for the charts
  createXAxis(options, xAxisAttributes, xAxisData, chartType);
  createYAxis(options);
  createGrid(options);

  return options;
};

const createGrid = (options: EChartsOption) => {
  options.grid = {
    left: '5%',
    right: '5%',
    bottom: '20%',
    // Leave enough space at the top for the title and legend
    top: 100,
    containLabel: true,
  };
};

const createXAxis = (options: EChartsOption, xAxisAttributes: string[], xAxisData: any[], chartType: string) => {
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
        fontSize: 30,
        margin: 25,
      },
      nameGap: 70,
    };
  }
};

const createYAxis = (options: EChartsOption) => {
  options.yAxis = {
    type: 'value',
    axisLabel: {
      fontSize: 30,
    },
    min: 'dataMin',
  };
};

const createColors = (options: any, data: any): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const stationName = data[i].NAME;
    const stationIndex = stationColors.findIndex((station) => station.stationName === stationName);
    if (stationIndex === -1) {
      const color = getColor(stationColors.length % 9);
      stationColors.push({ stationName, color });
      colors.push(color);
    } else {
      colors.push(stationColors[stationIndex].color);
    }
  }
  return colors;
};

function createMultiLineChart(
  options: EChartsOption,
  data: any[],
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  yAxisData: any[],
  xAxisData: string[]
) {
  const stationNames = [];
  for (let i = 0; i < data.length; i++) {
    stationNames.push(data[i].NAME);
  }

  options.series = [];

  for (let i = 0; i < data.length; i++) {
    options.series.push({
      name: data[i].NAME,
      type: 'line',

      lineStyle: {
        width: 7, // Set the thickness of the line to 3
      },
      data: data[i].OBSERVATIONS[yAxisAttributes[0]],
    });
  }

  options.legend = {
    data: stationNames,
    textStyle: {
      fontSize: 32,
      lineHeight: -20,
    },
    // Set the legend's position below the title
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

  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'line',
      data: yAxisData[i],
      name: yAxisAttributes[0],
      lineStyle: {
        width: 7, // Set the thickness of the line to 3
      },
      markArea: {
        silent: true,
        itemStyle: {
          opacity: 0.3,
        },
        data: [
          [
            {
              xAxis: xAxisData[xAxisData.length / 2],
            },
            {
              xAxis: xAxisData[xAxisData.length - 1],
            },
          ],
        ],
      },
    });
  }
  options.dataZoom = [
    {
      show: true,
      realtime: true,
      start: 65,
      end: 85,
    },
    {
      type: 'inside',
      realtime: true,
      start: 65,
      end: 85,
    },
  ];
}

function createBarChart(
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
      colorBy: 'data',
      label: { show: true, fontSize: 20 },
    });
  }
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
      symbolSize: 20,
      data: [[xAxisData[i].value, yAxisData[i]]],
      label: { show: true, fontSize: 20, position: 'right', color: 'white', formatter: xAxisData[i].name ? xAxisData[i].name : 'unknown' },
    });
    // options.legend.data?.push(xAxisData[i].name ? xAxisData[i].name : 'unknown');
  }
}

function createTitle(options: EChartsOption, yAxisAttributes: string[], xAxisAttributes: string[], stationName: string) {
  let finalVariableName = yAxisAttributes[0];
  if (!finalVariableName) {
    finalVariableName = 'None';
  }
  if (finalVariableName.split('_').length > 1) {
    const variableName = yAxisAttributes[0].split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    variableName.pop();
    variableName.pop();

    finalVariableName = variableName.join(' ');
  }

  for (let i = 0; i < yAxisAttributes.length; i++) {
    options.title = {
      text: `${finalVariableName} versus ${xAxisAttributes[0]} for ${stationName}`,
      textStyle: {
        fontSize: 40,
      },
      left: 'center',
    };
  }
}

const createAxisData = (data: any, yAxisAttributes: string[], xAxisAttributes: string[]) => {
  let yAxisData: any[] = [];
  let xAxisData: any[] = [];
  const station = data[0];
  if (
    yAxisAttributes[0] === 'elevation' ||
    yAxisAttributes[0] === 'latitude' ||
    yAxisAttributes[0] === 'longitude' ||
    yAxisAttributes[0] === 'name'
  ) {
    for (let i = 0; i < data.length; i++) {
      yAxisData.push(data[i].OBSERVATIONS[yAxisAttributes[0]]);
    }
  } else {
    if (yAxisAttributes[0] === 'date_time') {
      yAxisData = data[0].OBSERVATIONS['date_time'];
      for (let i = 0; i < yAxisData.length; i++) {
        const date = new Date(yAxisData[i]);
        //yAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
        yAxisData[i] = date.toDateString();
      }
    } else {
      for (let i = 0; i < yAxisAttributes.length; i++) {
        yAxisData.push(data[0].OBSERVATIONS[yAxisAttributes[i]]);
      }
    }
  }
  if (
    xAxisAttributes[0] === 'elevation' ||
    xAxisAttributes[0] === 'latitude' ||
    xAxisAttributes[0] === 'longitude' ||
    xAxisAttributes[0] === 'name'
  ) {
    for (let i = 0; i < data.length; i++) {
      xAxisData.push(data[i].OBSERVATIONS[xAxisAttributes[0]]);
    }
  } else {
    if (xAxisAttributes[0] === 'date_time') {
      xAxisData = [...data[0].OBSERVATIONS['date_time']];
      for (let i = 0; i < xAxisData.length; i++) {
        const date = new Date(xAxisData[i]);
        // xAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
        xAxisData[i] = date.toDateString();
      }
    } else {
      // for (let i = 0; i < xAxisAttributes.length; i++) {
      //   console.log(data[0].OBSERVATIONS[xAxisAttributes[i]], xAxisAttributes[i]);
      //   xAxisData.push(data[0].OBSERVATIONS[xAxisAttributes[i]]);
      // }
    }
  }

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
