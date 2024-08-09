import { EChartsOption } from 'echarts';

export type OptionParams = {
  data: (string | number)[][];
  chartType?: string;
  visualizationElements: {
    xAxis: string | undefined;
    yAxis: string | undefined;
    label: string | undefined;
    indicator: string | undefined;
    value: string | undefined;
    bin: string | undefined;
    count: string | undefined;
    bubbleDiameter: string | undefined;
    treemapParent: string | number | undefined;
    treemapChild: string | number | undefined;
    scatterMatrixAttributes: string[];
  };
};

export type ChartType = keyof typeof charts;

interface TreeNode {
  name: string | number;
  itemStyle: object;
  colorSaturation: number[];
  value?: number;
  children?: TreeNode[];
}

// style for labels
const nameTextStyle = {
  fontSize: 14,
  fontWeight: 'bold',
  // overflow: "truncate",
  ellipsis: '...',
};

// add padding to the chart
const grid = {
  left: '15%',
  right: '15%',
  top: '15%',
  bottom: '15%',
};

export const charts = {
  'Column Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;

      // Find the index of the xAxis, yAxis, and label in the data array
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);

      console.log('visualizationElements from column chart', visualizationElements);

      // Check if the required columns exist in the data array
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Column Chart> Required columns not found in data');
      }

      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: { xAxisVal: string | number; [key: string]: number | string }[], row) => {
        const xAxisVal = row[xAxisIndex];
        const labelVal = row[labelIndex];
        const yAxisVal = row[yAxisIndex];

        // Check if the xAxisVal already exists in the result array
        const existingXAxisVal = result.find(
          (item: { xAxisVal: string | number; [key: string]: number | string }) => item.xAxisVal === xAxisVal
        );
        if (existingXAxisVal) {
          // If the xAxisVal exists, update the yAxisVal for the corresponding labelVal
          existingXAxisVal[labelVal] = yAxisVal;
        } else {
          // If the xAxisVal doesn't exist, add a new object to the result array
          result.push({ xAxisVal, [labelVal]: yAxisVal });
        }
        return result;
      }, []);

      // Get the unique years from the data array
      const uniqueYears = Array.from(new Set(data.slice(1).map((row: (string | number)[]) => row[labelIndex])));
      const headers = [visualizationElements?.xAxis, ...uniqueYears];
      console.log('headers', headers);

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        dataset: {
          dimensions: headers,
          source: reformattedData,
        },
        axisPointer: {
          type: 'shadow',
          formatter: (params: Partial<EChartsOption>) => {
            return `${params.value}`;
          },
        },
        xAxis: {
          type: 'category',
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: headers.slice(1).map((year: string | number | undefined) => ({ type: 'bar' })),
      };

      return option;
    },

    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on X-axis',
      },
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on column label',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis/series',
      },
    ],
  },

  'Bar Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);

      if (xAxisIndex === -1 || yAxisIndex === -1) {
        throw new Error('Bar chart> Required columns not found in data');
      }

      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: { [key: string]: string | number }[], row) => {
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        result.push({
          [visualizationElements?.xAxis as string]: xAxisValue,
          [visualizationElements?.yAxis as string]: yAxisValue,
        });
        return result;
      }, []);

      const option = {
        grid: grid,
        dataset: {
          source: reformattedData,
        },
        xAxis: {
          type: 'value',
          name: visualizationElements?.xAxis,
          nameTextStyle: {
            fontSize: 14,
            fontWeight: 'bold',
          },
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        yAxis: {
          type: 'category',
          name: visualizationElements?.yAxis,
          nameTextStyle: {
            fontSize: 14,
            fontWeight: 'bold',
          },
          data: reformattedData.map((row) => row[visualizationElements?.yAxis as string]),
        },
        series: [
          {
            type: 'bar',
            data: reformattedData.map((row) => row[visualizationElements?.xAxis as string]),
          },
        ],
      };
      console.log('option from bar chart>', option);
      return option;
    },

    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on Y-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on X-axis',
      },
    ],
  },
  // ? Should scatter chart also have categorical data on the X-axis?
  'Scatter Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      if (xAxisIndex === -1 || yAxisIndex === -1) {
        throw new Error('Scatter Chart> Required columns not found in data');
      }
      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: { [key: string]: string | number }[], row) => {
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        result.push({
          [visualizationElements?.xAxis as string]: xAxisValue,
          [visualizationElements?.yAxis as string]: yAxisValue,
        });
        return result;
      }, []);
      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        dataset: {
          source: reformattedData,
        },
        xAxis: {
          type: 'value',
          name: visualizationElements?.xAxis,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis,
          nameTextStyle: nameTextStyle,
        },
        series: [
          {
            type: 'scatter',
          },
        ],
      };
      return option;
    },
    attributes: [
      {
        types: ['discrete', 'continuous', 'nominal', 'ordinal'],
        notes: 'Used on X-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
    ],
  },
  // TODO: Check if it's a date, and if it is, consider order
  'Radar Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      // Find the index of the indicator, label, and value in the data array
      const indicatorIndex = data[0].indexOf(visualizationElements?.indicator as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      const valueIndex = data[0].indexOf(visualizationElements?.value as string);
      // console.log("indicator", indicator, "label", label, "value", value);

      if (indicatorIndex === -1 || labelIndex === -1) {
        throw new Error('Radar Chart> Required columns not found in data');
      }

      // Unique indicator/name of values around radar chart
      const indicators = Array.from(new Set(data.slice(1).map((row: (string | number)[]) => row[indicatorIndex])));
      const reformattedData = data.slice(1).reduce((result: { [key: string]: number | string }[], row) => {
        const rowIndicator = row[indicatorIndex];
        const rowLabel = row[labelIndex];
        const rowValue = row[valueIndex];

        const existingCity = result.find(
          (item: { [key: string]: number | string }) => item[visualizationElements?.label as string] === rowLabel
        );
        if (existingCity) {
          existingCity[rowIndicator] = rowValue;
        } else {
          result.push({
            [visualizationElements?.label as string]: rowLabel,
            [rowIndicator]: rowValue,
          });
        }
        return result;
      }, []);

      const option = {
        // grid: grid,
        legend: {},
        tooltip: {},
        radar: {
          indicator: indicators.map((indicator: string | number) => ({
            name: indicator,
          })),
        },
        series: reformattedData.map((city) => ({
          name: city[visualizationElements?.label as string],
          type: 'radar',
          data: [
            {
              value: Object.values(city).slice(1),
              name: city[visualizationElements?.label as string],
            },
          ],
        })),
      };
      return option;
    },
    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as label',
      },
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as indicator or arranges data in a circle',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used as value',
      },
    ],
  },

  'Line Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Line Chart> Required columns not found in data');
      }
      // get all unique x-axis values (i.e. Jan, Feb, Mar, Apr, May)
      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));
      console.log('xAxisVals', xAxisVals);
      // get all unique label names (i.e. group_A, group_B, group_C)
      const labelNames = Array.from(new Set(data.slice(1).map((row) => row[labelIndex])));
      console.log('labelNames', labelNames);
      // create new dataset that has the label name as the key, and an array of equivalent length as the xAxis as the value
      const reformattedData = labelNames.reduce((result: { [key: string]: (number | string)[] }, labelName) => {
        result[labelName] = new Array(xAxisVals.length).fill(0);
        return result;
      }, {});
      // iterate through each row's yAxis value and add it at the right index of the array
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const labelName = row[labelIndex];
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        const xAxisValueIndex = xAxisVals.indexOf(xAxisValue);
        reformattedData[labelName][xAxisValueIndex] = yAxisValue;
      }
      const reformattedSeries = [];
      for (const [key, value] of Object.entries(reformattedData)) {
        reformattedSeries.push({
          name: key,
          type: 'line',
          symbolSize: 10,

          total: 'stack',
          data: value,
        });
      }
      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisVals,
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            lineStyle: {
              // width: 2,
            },
          },
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: reformattedSeries,
      };
      return option;
    },

    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on X-axis',
      },
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as line label',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
    ],
  },
  // TODO: Refactor. A bit confusing to read.
  'Column Histogram': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;

      const binIndex = data[0].indexOf(visualizationElements?.bin as string);

      if (binIndex === -1) {
        throw new Error('Column Histogram> Required columns not found in data');
      }

      const yAxisName = `${visualizationElements?.bin} (Frequency)`;

      const values = data.slice(1).map((row) => Number(row[binIndex] as string)) as number[];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binSize = (max - min) / Math.sqrt(values.length);
      console.log('bin size', binSize);
      const bins = [];

      for (let i = min; i <= max; i += binSize) {
        const binStart = i;
        const binEnd = i + binSize;
        const binLabel = `${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`;
        const numCounted = values.filter((value) => value >= binStart && value < binEnd).length;
        bins.push({
          [visualizationElements?.bin as string]: binLabel,
          [yAxisName]: numCounted,
        });
      }

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        dataset: {
          source: bins,
        },
        xAxis: {
          type: 'category',
          name: visualizationElements?.bin,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
          nameTextStyle: nameTextStyle,
        },
        series: [
          {
            type: 'bar',
            barCategoryGap: '0.5%',
          },
        ],
      };
      return option;
    },
    attributes: [
      {
        types: ['discrete', 'continuous'],
        notes: "Used for bin (i.e. header called 'grades', grades get binned)",
      },
      {
        types: ['nominal', 'ordinal'],
        notes: "Used for count (i.e. header called 'students', only interested in the name of the column)",
      },
    ],
  },

  'Line Histogram': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;

      const binIndex = data[0].indexOf(visualizationElements?.bin as string);
      console.log('binIndex', binIndex);
      if (binIndex === -1) {
        throw new Error('Line Histogram> Required columns not found in data');
      }

      const yAxisName = `${visualizationElements?.bin} (Frequency)`;

      const values = data.slice(1).map((row) => Number(row[binIndex] as string)) as number[];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binSize = (max - min) / Math.sqrt(values.length);
      console.log('bin size', binSize);
      const bins = [];

      for (let i = min; i <= max; i += binSize) {
        const binStart = i;
        const binEnd = i + binSize;
        const binLabel = `${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`;
        const numCounted = values.filter((value) => value >= binStart && value < binEnd).length;
        bins.push({
          [visualizationElements?.bin as string]: binLabel,
          [yAxisName]: numCounted,
        });
      }

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        dataset: {
          source: bins,
        },
        xAxis: {
          type: 'category',
          name: visualizationElements?.bin,
          nameTextStyle: nameTextStyle,
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: { show: true },
        },
        series: [
          {
            type: 'line',
            smooth: 'true',
          },
        ],
      };
      return option;
    },
    attributes: [
      {
        types: ['discrete', 'continuous'],
        notes: "Used for bin (i.e. header called 'grades', grades get binned)",
      },
      {
        types: ['discrete', 'continuous'],
        notes: "Used for count (i.e. header called 'students', only interested in the name of the column",
      },
    ],
  },

  'Waterfall Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      if (xAxisIndex === -1 || yAxisIndex === -1) {
        throw new Error('Waterfall Chart> Required columns not found in data');
      }

      const xAxisVals = data.slice(1).map((row) => row[xAxisIndex]);

      const convertedDataToFloat = data.slice(1, data.length).map((row) => {
        const newRow = row.map((cell) => {
          return Number(cell as string);
        });
        return newRow;
      });

      const positiveNegativeData: number[] = [];
      // Convert the data to positive-negative format
      // TODO: a bit gimmicky, but works for now. To revise later
      for (let i = 0; i < convertedDataToFloat.length; i++) {
        if (i === 0) {
          positiveNegativeData.push(convertedDataToFloat[i][yAxisIndex] as number);
        } else {
          positiveNegativeData.push((convertedDataToFloat[i][yAxisIndex] as number) - (convertedDataToFloat[i - 1][yAxisIndex] as number));
        }
      }

      const convertToWaterfallData = (data: number[]) => {
        const helper: (number | string)[] = [];
        const positive: (number | string)[] = [];
        const negative: (number | string)[] = [];

        for (let i = 0, sum = 0; i < data.length; i++) {
          if (data[i] >= 0) {
            positive.push(data[i]);
            negative.push('-');
          } else {
            positive.push('-');
            negative.push(-data[i]);
          }

          if (i === 0) {
            helper.push(0);
          } else {
            sum += data[i - 1];
            if (data[i] < 0) {
              helper.push(sum + data[i]);
            } else {
              helper.push(sum);
            }
          }
        }
        return {
          helper: helper, // gimmicky way of stacking bars
          positive: positive,
          negative: negative,
        };
      };
      const waterfallData = convertToWaterfallData(positiveNegativeData);
      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xAxisVals,
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: [
          {
            type: 'bar',
            stack: 'total',
            silent: true,
            itemStyle: {
              color: 'transparent',
            },
            data: waterfallData.helper,
          },
          {
            type: 'bar',
            stack: 'total',
            data: waterfallData.positive,
          },
          {
            type: 'bar',
            stack: 'total',
            data: waterfallData.negative,
          },
        ],
      };
      return option;
    },
    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on X axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y axis',
      },
    ],
  },

  'Pie Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const valueIndex = data[0].indexOf(visualizationElements?.value as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);

      if (valueIndex === -1 || labelIndex === -1) {
        throw new Error('Pie Chart> Required columns not found in data');
      }

      const option = {
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        tooltip: {},
        dataset: {
          source: data.slice(1),
        },
        series: [
          {
            type: 'pie',
            radius: '50%',
            data: data.slice(1).map((row) => ({
              value: row[valueIndex],
              name: row[labelIndex],
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
      return option;
    },

    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as label',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used as value',
      },
    ],
  },

  'Stacked Area Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Stacked Area Chart> Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const series = data
        .slice(1)
        .reduce((result: { name: string | number; type: string; stack: string; areaStyle: object; data: (string | number)[] }[], row) => {
          const existingSeries = result.find((series) => series.name === row[labelIndex]);
          if (existingSeries) {
            existingSeries.data.push(row[yAxisIndex]);
          } else {
            result.push({
              name: row[labelIndex],
              type: 'line',
              stack: 'total',
              areaStyle: {},
              data: [row[yAxisIndex]],
            });
          }
          return result;
        }, []);

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisVals,
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: series,
      };

      return option;
    },

    attributes: [
      {
        types: ['nominal', 'ordinal', 'discrete', 'continuous'],
        notes: 'Used on X-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used as label',
      },
    ],
  },

  'Stacked 100% Area Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Stacked 100% Area Chart> Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const percentages = xAxisVals.map((xAxisVal) => {
        const values = data
          .slice(1)
          .filter((row) => row[xAxisIndex] === xAxisVal)
          .map((row) => ({
            name: row[labelIndex],
            xAxisVal: row[xAxisIndex],
            yAxisVal: Number(row[yAxisIndex]),
          }));
        const total = values.reduce((acc, curr) => acc + curr.yAxisVal, 0);
        return values.map(({ name, xAxisVal, yAxisVal }) => ({
          name,
          xAxisVal,
          yAxisVal: (yAxisVal / total) * 100,
        }));
      });

      const groups = Array.from(new Set(data.slice(1).map((row) => row[labelIndex])));
      const groupedPercentages = groups.map((group) => ({
        group,
        percentage: percentages.reduce((acc, percentage) => {
          const groupPercentage = percentage.find((p) => p.name === group);
          if (groupPercentage) {
            acc.push(groupPercentage.yAxisVal);
          }
          return acc;
        }, [] as number[]), // Specify the type of `acc` as `number[]`
      }));

      const series = groupedPercentages.map((group) => ({
        name: group.group,
        type: 'line',
        stack: 'total',
        areaStyle: {},
        data: group.percentage,
      }));

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisVals,
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: series,
      };
      return option;
    },

    attributes: [
      {
        types: ['nominal', 'ordinal', 'discrete', 'continuous'],
        notes: 'Used on X-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used as label',
      },
    ],
  },

  'Stacked Column Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Stacked Column Chart> Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const series = data
        .slice(1)
        .reduce(
          (
            result: { name: string | number; type: string; stack: string; areaStyle: object; data: (string | number)[]; label: object }[],
            row
          ) => {
            const existingSeries = result.find((series) => series.name === row[labelIndex]);
            if (existingSeries) {
              existingSeries.data.push(row[yAxisIndex]);
            } else {
              result.push({
                name: row[labelIndex],
                type: 'bar',
                stack: 'total',
                areaStyle: {},
                data: [row[yAxisIndex]],
                label: {
                  show: true,
                },
              });
            }
            return result;
          },
          []
        );

      // console.log("SERIES STACKED COLUMN CHART>", series);

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xAxisVals,
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: series,
      };

      return option;
    },
    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on X-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as label',
      },
    ],
  },

  'Stacked 100% Column Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Stacked 100% Column Chart> Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      // Calculate the percentage of each value in the xAxis
      const percentages = xAxisVals.map((xAxisVal) => {
        const values = data
          .slice(1)
          .filter((row) => row[xAxisIndex] === xAxisVal)
          .map((row) => ({
            name: row[labelIndex],
            xAxisVal: row[xAxisIndex],
            yAxisVal: Number(row[yAxisIndex]), // Convert to number
          }));
        const total = values.reduce((acc, curr) => acc + curr.yAxisVal, 0);
        return values.map(({ name, xAxisVal, yAxisVal }) => ({
          name,
          xAxisVal,
          yAxisVal: (yAxisVal / total) * 100,
        }));
      });

      // Get all unique groups
      const groups = Array.from(new Set(data.slice(1).map((row) => row[labelIndex])));

      // Group the percentages by group
      const groupedPercentages = groups.map((group) => ({
        group,
        percentage: percentages.reduce((acc: number[], percentage) => {
          const groupPercentage = percentage.find((p) => p.name === group);
          if (groupPercentage) {
            acc.push(groupPercentage.yAxisVal);
          }
          return acc;
        }, []),
      }));

      // Create the series
      const series = groupedPercentages.map((group) => ({
        name: group.group,
        type: 'bar',
        stack: 'total',
        areaStyle: {},
        data: group.percentage,
        label: {
          show: true,
          formatter: (params: Partial<EChartsOption>) => Math.round(params.value as number) + '%',
        },
      }));

      const option = {
        grid: grid,
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xAxisVals,
          name: visualizationElements?.xAxis as string,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: visualizationElements?.yAxis as string,
          nameTextStyle: nameTextStyle,
          axisLine: {
            show: true,
          },
          axisTick: {
            show: true,
          },
        },
        series: series,
      };
      return option;
    },
    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used on X-axis',
      },
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as column label',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
    ],
  },

  // TODO: Bubble chart --> scatter chart if only two attributes are given, generate scatter plot
  'Bubble Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const bubbleDiameterIndex = data[0].indexOf(visualizationElements?.bubbleDiameter as string);
      console.log('bubble diameter index', bubbleDiameterIndex);
      if (xAxisIndex === -1 || yAxisIndex === -1 || bubbleDiameterIndex === -1) {
        throw new Error('Bubble chart> Required columns not found in data');
      }
      const xAxisName = data[0][xAxisIndex];
      const yAxisName = data[0][yAxisIndex];
      const reformattedData = data.slice(1).map((row) => [row[xAxisIndex], row[yAxisIndex], row[bubbleDiameterIndex]]);
      const bubbleDiameterSizeIndex = 2; // from reformattedData

      const minBubbleValue = Math.min(...reformattedData.slice(1).map((row) => Number(row[2] as string)));
      const maxBubbleValue = Math.max(...reformattedData.slice(1).map((row) => Number(row[2] as string)));

      const minSize = 5;
      const maxSize = 50;

      const option = {
        grid: grid,
        legend: {},
        tooltip: {
          formatter: (params: Partial<EChartsOption>) => `${visualizationElements?.bubbleDiameter}: ${(params.value as number[])[2]}`,
        },
        xAxis: {
          type: 'value',
          name: xAxisName,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
          nameTextStyle: nameTextStyle,
        },
        series: [
          {
            type: 'scatter',
            data: reformattedData,
            symbolSize: (data: number[]) =>
              minSize +
              Math.sqrt((data[bubbleDiameterSizeIndex] - minBubbleValue) / (maxBubbleValue - minBubbleValue)) * (maxSize - minSize), // ! Might need a better way to scale this
          },
        ],
      };
      return option;
    },
    attributes: [
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on X-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used as size',
      },
    ],
  },

  'Variable Width Column Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) {
        throw new Error('Data is empty');
      }
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Variable Width Column Chart> Required columns not found in data');
      }

      function generateUniqueRandomColors(numColors = 9) {
        const baseHues = [210, 120, 40, 0, 190, 140, 20, 270, 330]; // Base hues for variety
        const saturation = 0.7; // Fixed saturation for consistency
        const minLightness = 0.45;
        const maxLightness = 0.65;

        return baseHues.slice(0, numColors).map((hue, index) => {
          const lightness = minLightness + (maxLightness - minLightness) * (index / (numColors - 1));
          return hslToHex(hue, saturation, lightness);
        });
      }

      function hslToHex(h: number, s: number, l: number) {
        const rgb = hslToRgb(h, s, l);
        return (
          '#' +
          rgb
            .map((x) => {
              const hex = Math.round(x * 255).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            })
            .join('')
        );
      }

      function hslToRgb(h: number, s: number, l: number) {
        h /= 360;
        let r, g, b;

        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
        }

        return [r, g, b];
      }
      // Reformat the data to include a start and end, which is required to make a variable width column chart
      let prev = 0;
      const reformattedData = data.slice(1).map((row) => {
        const start = prev;
        const end = prev + (Number(row[xAxisIndex]) as number);
        prev = end;
        return [row[labelIndex], row[yAxisIndex], start, end];
      });
      // index of the label, y value, start index, end index
      const reformattedDataLabelIndex = 0;
      const reformattedDataYValue = 1;
      const reformattedDataStartIndex = 2;
      const reformattedDataEndIndex = 3;

      const colors = generateUniqueRandomColors(reformattedData.length);
      const styledReformattedData = reformattedData.map((row, index) => {
        return {
          value: row,
          itemStyle: {
            color: colors[index],
          },
        };
      });

      const option = {
        grid: grid,
        tooltip: {},
        xAxis: {
          scale: true,
          name: visualizationElements?.xAxis,
          nameTextStyle: nameTextStyle,
        },
        yAxis: {
          name: visualizationElements?.yAxis,
          nameTextStyle: nameTextStyle,
        },
        series: [
          {
            type: 'custom',
            renderItem: function (_params: any, api: any) {
              const yValue = api.value(reformattedDataYValue); // this is the y value
              const start = api.coord([api.value(reformattedDataStartIndex), yValue]); // api.value(2) refers to the index that is used at the start
              const size = api.size([api.value(reformattedDataEndIndex) - api.value(reformattedDataStartIndex), yValue]); // api.value(3) is the end index
              const style = api.style();
              return {
                type: 'rect',
                shape: {
                  x: start[0],
                  y: start[1],
                  width: size[0],
                  height: size[1],
                },
                style: style,
              };
            },
            encode: {
              x: [reformattedDataEndIndex, reformattedDataStartIndex],
              y: reformattedDataYValue,
              // tooltip: [0, 1, 2],
              itemName: reformattedDataLabelIndex,
            },
            data: styledReformattedData,
          },
        ],
      };
      return option;
    },
    attributes: [
      {
        types: ['nominal', 'ordinal'],
        notes: 'Used as column label',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on Y-axis/series',
      },
      {
        types: ['discrete', 'continuous'],
        notes: 'Used on X-axis',
      },
    ],
  },

  'Treemap Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      console.log('TREEMAP> ', data);
      if (!data || data.length < 1) return;

      // Find the index of parent (fueltype), child (carbody), and value (average_price) in the header row
      const parentIndex = data[0].indexOf(visualizationElements?.treemapParent as string);
      const childIndex = data[0].indexOf(visualizationElements?.treemapChild as string);
      const valueIndex = data[0].indexOf(visualizationElements?.value as string | number);

      console.log('parentIndex', parentIndex, 'childIndex', childIndex, 'valueIndex', valueIndex);

      // Function to parse array data and convert to tree structure with random colors
      function parseArrayData(data: (string | number)[][]) {
        const tree: { [key: string]: TreeNode } = {};
        const rootNodes = [];

        // Skip the header row
        for (let i = 1; i < data.length; i++) {
          const parentName = data[i][parentIndex];
          const childName = data[i][childIndex];
          const nodeValue = Number(data[i][valueIndex]);

          const node = {
            name: childName,
            value: nodeValue,
          };

          if (!tree[parentName]) {
            tree[parentName] = {
              name: parentName,
              children: [],
              colorSaturation: [0.35, 0.5],
              itemStyle: {
                borderColorSaturation: 0.6,
                gapWidth: 1,
              },
            };
            rootNodes.push(tree[parentName]);
          }

          if (tree[parentName].children) {
            tree[parentName].children.push(node as TreeNode);
          }
        }

        return rootNodes;
      }

      // Function to get the maximum depth of the tree
      function getMaxDepth(node: TreeNode, currentDepth = 0): number {
        if (!node.children || node.children.length === 0) {
          return currentDepth;
        }
        return Math.max(...node.children.map((child) => getMaxDepth(child, currentDepth + 1)));
      }

      // Function to generate levels based on tree depth
      function generateLevels(maxDepth: number) {
        const levels = [];
        for (let i = 0; i < maxDepth; i++) {
          levels.push({
            itemStyle: {
              borderColor: '#fff',
              borderWidth: Math.max(4 - i, 1),
              gapWidth: Math.max(4 - i, 1),
            },
          });
        }
        return levels;
      }

      // Parse the array data
      const treeData = parseArrayData(data);
      console.log('treedata', treeData);

      // Get the maximum depth of the tree
      const maxDepth = Math.max(...treeData.map((root) => getMaxDepth(root)));

      // Generate levels based on the maximum depth
      const levels = generateLevels(maxDepth);

      // Return the configuration object
      return {
        tooltip: {
          formatter: function (info: Partial<EChartsOption>) {
            const value = info.value;
            let str = info.name + ': ';
            if (value != null) {
              str += value.toLocaleString();
            } else {
              str += 'N/A';
            }
            return str;
          },
        },
        series: [
          {
            type: 'treemap',
            data: treeData,
            levels: levels,
          },
        ],
      };
    },
  },
  'Scatter Matrix Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      const headers = data[0];

      console.log('visualizationElements for scatter matrix', visualizationElements?.scatterMatrixAttributes);

      // Filter schema based on scatterMatrixAttributes
      const schema = visualizationElements?.scatterMatrixAttributes
        .map((attr) => ({
          name: attr,
          index: headers.indexOf(attr),
        }))
        .filter((item) => item.index !== -1);

      if (!schema || schema.length < 2) {
        throw new Error('Scatter Matrix> At least two attributes are required');
      }

      const DIMENSION_COUNT = schema.length;
      const GAP = 10;
      const BASE_LEFT = 5;
      const BASE_TOP = 5;
      const GRID_WIDTH = (90 - BASE_LEFT - GAP * (DIMENSION_COUNT - 1)) / DIMENSION_COUNT;
      const GRID_HEIGHT = (90 - BASE_TOP - GAP * (DIMENSION_COUNT - 1)) / DIMENSION_COUNT;
      const SYMBOL_SIZE = 4;

      function retrieveScatterData(data: (string | number)[][], dimX: number, dimY: number) {
        return data.slice(1).map((item) => [Number(item[dimX]), Number(item[dimY])]);
      }

      function retrieveHistogramData(data: (string | number)[][], index: number) {
        const values = data.slice(1).map((row) => Number(row[index]));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
        const binSize = (max - min) / binCount;

        const bins = Array(binCount).fill(0);
        values.forEach((value) => {
          const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
          bins[binIndex]++;
        });

        return bins.map((count, i) => {
          const binStart = min + i * binSize;
          const binEnd = min + (i + 1) * binSize;
          return {
            value: count,
            interval: [binStart.toFixed(2), binEnd.toFixed(2)],
          };
        });
      }

      function generateGrids() {
        let index = 0;
        const grid = [];
        const xAxis = [];
        const yAxis = [];
        const series = [];

        // Generate scatter plots
        for (let i = 0; i < DIMENSION_COUNT; i++) {
          for (let j = 0; j < DIMENSION_COUNT; j++) {
            if (i !== j) {
              grid.push({
                left: BASE_LEFT + j * (GRID_WIDTH + GAP) + '%',
                top: BASE_TOP + i * (GRID_HEIGHT + GAP) + '%',
                width: GRID_WIDTH + '%',
                height: GRID_HEIGHT + '%',
              });

              xAxis.push({
                gridIndex: index,
                type: 'value',
                name: schema![j].name,
                nameLocation: 'middle',
                nameGap: 20,
                splitNumber: 3,
                position: 'bottom',
                axisLine: { show: true, onZero: false },
                axisTick: { show: true },
                axisLabel: { show: true },
                scale: true,
              });

              yAxis.push({
                gridIndex: index,
                type: 'value',
                name: schema![i].name,
                nameLocation: 'middle',
                nameGap: 30,
                splitNumber: 3,
                position: 'left',
                axisLine: { show: true, onZero: false },
                axisTick: { show: true },
                axisLabel: { show: true },
                scale: true,
              });

              series.push({
                type: 'scatter',
                symbolSize: SYMBOL_SIZE,
                xAxisIndex: index,
                yAxisIndex: index,
                data: retrieveScatterData(data as (string | number)[][], schema![j].index, schema![i].index),
              });

              index++;
            }
          }
        }

        // Generate histograms
        for (let i = 0; i < DIMENSION_COUNT; i++) {
          const histogramData = retrieveHistogramData(data as (string | number)[][], schema![i].index);

          grid.push({
            left: BASE_LEFT + i * (GRID_WIDTH + GAP) + '%',
            top: BASE_TOP + i * (GRID_HEIGHT + GAP) + '%',
            width: GRID_WIDTH + '%',
            height: GRID_HEIGHT + '%',
          });

          xAxis.push({
            gridIndex: index,
            type: 'category',
            data: histogramData.map((item) => `${item.interval[0]}-${item.interval[1]}`),
            name: schema![i].name,
            nameLocation: 'middle',
            nameGap: 20,
            axisLabel: {
              interval: 0,
            },
            axisTick: { show: true },
            axisLine: { show: true },
          });

          yAxis.push({
            gridIndex: index,
            type: 'value',
            name: 'Frequency',
            nameLocation: 'middle',
            nameGap: 30,
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: true },
          });

          series.push({
            type: 'bar',
            xAxisIndex: index,
            yAxisIndex: index,
            data: histogramData.map((item) => item.value),
            barWidth: '80%',
            tooltip: {
              trigger: 'item',
              formatter: function (params: Partial<EChartsOption>) {
                const interval = histogramData[params.dataIndex as number].interval;
                return `Bin: ${interval[0]} - ${interval[1]}<br/>Count: ${params.value}`;
              },
            },
          });

          index++;
        }

        return { grid, xAxis, yAxis, series };
      }

      const gridOption = generateGrids();

      return {
        animation: false,
        tooltip: { trigger: 'item' },
        xAxis: gridOption.xAxis,
        yAxis: gridOption.yAxis,
        grid: gridOption.grid,
        series: gridOption.series,
      };
    },
  },
};
