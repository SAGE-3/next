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
  stationName: string[],
  chartType: string,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  stationMetadata?: any,
  transform?: (filterType | aggregateType)[]
): Promise<EChartsOption> => {
  const options: EChartsOption = {};
  const yAxisData: any[] = [];
  let xAxisData: any[] = [];
  let station;
  if (stationMetadata === undefined) {
    const response = await fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    );
    station = await response.json();
    station = station.STATION[0];
  } else {
    station = stationMetadata[0];
  }
  console.log(station);
  for (let i = 0; i < yAxisAttributes.length; i++) {
    yAxisData.push(station.OBSERVATIONS[yAxisAttributes[i]]);
  }
  xAxisData = station.OBSERVATIONS['date_time'];
  for (let i = 0; i < xAxisData.length; i++) {
    const date = new Date(xAxisData[i]);
    xAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
  }
  switch (chartType) {
    case 'line':
      createLineChart(options, yAxisData, xAxisData);
      break;
    case 'bar':
      createBarChart(options, yAxisData, xAxisData);
      break;
  }

  createTitle(options, yAxisAttributes);
  return options;
};

function createLineChart(options: EChartsOption, yAxisData: string | any[], xAxisData: any[]) {
  options.series = [];
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'line',
      data: yAxisData[i],
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

function createBarChart(options: EChartsOption, yAxisData: string | any[], xAxisData: any[]) {
  options.series = [];
  options.xAxis = {
    type: 'category',
    data: xAxisData,
  };
  options.yAxis = {
    type: 'value',
  };
  for (let i = 0; i < yAxisData.length; i++) {
    options.series.push({
      type: 'bar',
      data: yAxisData[i],
    });
  }
}

function createTitle(options: EChartsOption, yAxisAttributes: string[]) {
  for (let i = 0; i < yAxisAttributes.length; i++) {
    options.title = {
      text: `${yAxisAttributes[i]} over time`,
      textStyle: {
        fontSize: 40,
      },
    };
  }
}
