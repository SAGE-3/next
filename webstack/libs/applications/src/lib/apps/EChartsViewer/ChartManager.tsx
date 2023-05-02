import type { EChartsOption } from 'echarts';

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

type seriesType = {
  name: string;
  type: string;
  data: any[];
};

export const ChartManager = async (
  stationNames: string[],
  chartType: string,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  stationMetadata?: any,
  transform?: (filterType | aggregateType)[]
): Promise<EChartsOption> => {
  const options: EChartsOption = {};
  const yAxisData: any[] = [];
  const xAxisData: any[] = [];
  let station;
  let data = [];
  const stationReadableNames = [];
  if (stationMetadata === undefined) {
    for (let i = 0; i < stationNames.length; i++) {
      const response = await fetch(
        `https://api.mesowest.net/v2/stations/timeseries?STID=${stationNames[i]}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
      );
      const sensor = await response.json();
      const sensorData = sensor['STATION'][0];

      stationReadableNames.push(sensorData.NAME);
      data.push(sensorData);
    }
    // const response = await fetch(
    //   `https://api.mesowest.net/v2/stations/timeseries?STID=${stationNames}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    // );
    // station = await response.json();
    // station = station.STATION[0];
  } else {
    data = stationMetadata;
    for (let i = 0; i < stationMetadata.length; i++) {
      stationReadableNames.push(stationMetadata[i].NAME);
    }
  }
  for (let i = 0; i < data.length; i++) {
    data[i].OBSERVATIONS['elevation'] = [data[i].ELEVATION];
    data[i].OBSERVATIONS['latitude'] = [data[i].LATITUDE];
    data[i].OBSERVATIONS['longitude'] = [data[i].LONGITUDE];
    data[i].OBSERVATIONS['name'] = [data[i].NAME];
  }
  switch (chartType) {
    case 'line':
      if (data.length > 1) {
        createMultiLineChart(options, data, yAxisAttributes, xAxisAttributes);
      } else if (data.length == 1) {
        createLineChart(options, data, yAxisAttributes, xAxisAttributes);
      }
      break;
    case 'bar':
      createBarChart(options, data, yAxisAttributes, xAxisAttributes);
      break;
  }
  createTitle(options, yAxisAttributes, xAxisAttributes, stationReadableNames.join(', '));
  return options;
};

function createMultiLineChart(options: EChartsOption, data: any[], yAxisAttributes: string[], xAxisAttributes: string[]) {
  const stationNames = [];
  let xAxisData: any[] = [];
  for (let i = 0; i < data.length; i++) {
    stationNames.push(data[i].NAME);
  }
  if (xAxisAttributes[0] === 'date_time') {
    xAxisData = data[0].OBSERVATIONS['date_time'];
    for (let i = 0; i < xAxisData.length; i++) {
      const date = new Date(xAxisData[i]);
      xAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      xAxisData.push(data[i].OBSERVATIONS[xAxisAttributes[0]]);
    }
  }

  options.yAxis = {
    type: 'value',
    axisLabel: {
      fontSize: 30,
    },
  };

  options.series = [];

  for (let i = 0; i < data.length; i++) {
    options.series.push({
      name: data[i].NAME,
      type: 'line',
      stack: 'total',
      lineStyle: {
        width: 7, // Set the thickness of the line to 3
      },
      data: data[i].OBSERVATIONS[yAxisAttributes[0]],
    });
  }
  options.tooltip = {
    trigger: 'axis',
  };
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
  (options.grid = {
    left: '3%',
    right: '4%',
    bottom: '3%',
    // Leave enough space at the top for the title and legend
    top: 100,
    containLabel: true,
  }),
    (options.xAxis = {
      type: 'category',
      data: xAxisData,
      axisLine: { onZero: false },

      axisLabel: {
        fontSize: 30,
      },
    });
}

function createLineChart(options: EChartsOption, data: any, yAxisAttributes: string[], xAxisAttributes: string[]) {
  const station = data[0];

  const yAxisData: any[] = [];
  let xAxisData: any[] = [];
  for (let i = 0; i < yAxisAttributes.length; i++) {
    yAxisData.push(station.OBSERVATIONS[yAxisAttributes[i]]);
  }
  if (xAxisAttributes[0] === 'date_time') {
    xAxisData = data[0].OBSERVATIONS['date_time'];
    for (let i = 0; i < xAxisData.length; i++) {
      const date = new Date(xAxisData[i]);
      xAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      xAxisData.push(data[i].OBSERVATIONS[xAxisAttributes[0]]);
    }
  }

  options.series = [];
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'line',
      data: yAxisData[i],
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
  (options.dataZoom = [
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
  ]),
    (options.yAxis = {
      type: 'value',
      axisLabel: {
        fontSize: 30,
      },
    });
  options.xAxis = {
    type: 'category',
    data: xAxisData,
    axisLine: { onZero: false },

    axisLabel: {
      fontSize: 30,
    },
  };
}

function createBarChart(options: EChartsOption, data: any, yAxisAttributes: string[], xAxisAttributes: string[]) {
  const station = data[0];
  const yAxisData: any[] = [];
  let xAxisData: any[] = [];
  for (let i = 0; i < yAxisAttributes.length; i++) {
    yAxisData.push(station.OBSERVATIONS[yAxisAttributes[i]]);
  }
  if (xAxisAttributes[0] === 'date_time') {
    xAxisData = data[0].OBSERVATIONS['date_time'];
    for (let i = 0; i < xAxisData.length; i++) {
      const date = new Date(xAxisData[i]);
      xAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      xAxisData.push(data[i].OBSERVATIONS[xAxisAttributes[0]]);
    }
  }

  options.series = [];

  options.series = [];
  options.xAxis = {
    type: 'category',
    data: xAxisData,
    axisLabel: {
      fontSize: 25,
    },
  };
  options.yAxis = {
    type: 'value',
    axisLabel: {
      fontSize: 30,
    },
  };
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'bar',
      data: yAxisData[i],
    });
  }
}

function createTitle(options: EChartsOption, yAxisAttributes: string[], xAxisAttributes: string[], stationName: string) {
  const variableName = yAxisAttributes[0].split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  delete variableName[variableName.length - 1];
  delete variableName[variableName.length - 2];
  const joinedVariableName = variableName.join(' ');

  for (let i = 0; i < yAxisAttributes.length; i++) {
    options.title = {
      text: `${joinedVariableName}versus ${xAxisAttributes[0]} for ${stationName}`,
      textStyle: {
        fontSize: 40,
      },
    };
  }
}
