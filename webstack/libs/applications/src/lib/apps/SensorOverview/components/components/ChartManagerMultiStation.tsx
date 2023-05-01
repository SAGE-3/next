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

export const ChartManagerMultiStation = async (
  stationNames: string[],
  chartType: string,
  yAxisAttributes: string[],
  xAxisAttributes: string[],
  transform?: (filterType | aggregateType)[]
): Promise<EChartsOption> => {
  const options: EChartsOption = {};
  const yAxisData: any[] = [];
  const xAxisData: any[] = [];
  const data = [];

  for (let i = 0; i < stationNames.length; i++) {
    const response = await fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${stationNames[i]}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    );
    const stationData = await response.json();
    const metaData = stationData.STATION[0];
    delete metaData.OBSERVATIONS;
    delete metaData.SENSOR_VARIABLES;
    delete metaData.SGID;
    delete metaData.UNITS;
    delete metaData.ELEV_DEM;
    delete metaData.GACC;
    delete metaData.WIMS_ID;
    data.push(metaData);
  }
  console.log(xAxisAttributes, yAxisAttributes);
  switch (chartType) {
    case 'scatter':
      createScatterPlot(options, data, xAxisAttributes[0], yAxisAttributes[0]);
      break;
    // case 'bar':
    //   createBarChart(options, yAxisData, xAxisData);
    //   break;
  }

  // createTitle(options, yAxisAttributes);
  return options;
};

function createScatterPlot(options: EChartsOption, data: any, xAttributeName: string, yAttributeName: string) {
  const scatterPlotData = [];
  for (let i = 0; i < data.length; i++) {
    scatterPlotData.push([data[xAttributeName], data[yAttributeName]]);
  }
  options.series = [];
  options.series.push({
    symbolSize: 20,
    data: scatterPlotData,
  });
}

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
