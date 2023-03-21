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
  transform?: (filterType | aggregateType)[]
): Promise<EChartsOption> => {
  const options: EChartsOption = {};
  const yAxisData: any[] = [];
  let xAxisData: any[] = [];
  console.log(yAxisAttributes, stationName, chartType, 'hllo');
  const response = await fetch(
    `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
  );
  const station = await response.json();
  for (let i = 0; i < yAxisAttributes.length; i++) {
    yAxisData.push(station.STATION[0].OBSERVATIONS[yAxisAttributes[i]]);
  }
  xAxisData = station.STATION[0].OBSERVATIONS['date_time'];
  for (let i = 0; i < xAxisData.length; i++) {
    const date = new Date(xAxisData[i]);
    xAxisData[i] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/') + [date.getHours(), date.getMinutes()].join(':');
  }
  switch (chartType) {
    case 'line':
      createLineChart(options, yAxisData, xAxisData);
  }

  createTitle(options, yAxisAttributes);
  console.log(options);
  return options;
};

function createLineChart(options: EChartsOption, yAxisData: string | any[], xAxisData: any[]) {
  options.series = [];
  console.log(xAxisData.length);
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
              xAxis: xAxisData[600],
            },
            {
              xAxis: xAxisData[850],
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
