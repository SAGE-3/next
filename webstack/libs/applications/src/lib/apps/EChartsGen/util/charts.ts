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
  name: string;
  itemStyle: {
    color: string;
  };
  value?: number;
  children?: TreeNode[];
}

export const charts = {
  'Column Chart': {
    generateOption: ({ data, visualizationElements }: Partial<OptionParams>) => {
      if (!data || data.length < 1) return;
      // Find the index of the xAxis, yAxis, and label in the data array
      const xAxisIndex = data[0].indexOf(visualizationElements?.xAxis as string);
      const yAxisIndex = data[0].indexOf(visualizationElements?.yAxis as string);
      const labelIndex = data[0].indexOf(visualizationElements?.label as string);

      // Check if the required columns exist in the data array
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        throw new Error('Required columns not found in data');
      }

      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const product = row[xAxisIndex];
        const year = row[labelIndex];
        const value = row[yAxisIndex];

        // Check if the product already exists in the result array
        const existingProduct = result.find((item: any) => item.product === product);
        if (existingProduct) {
          // If the product exists, update the value for the corresponding year
          existingProduct[year] = value;
        } else {
          // If the product doesn't exist, add a new object to the result array
          result.push({ product, [year]: value });
        }
        return result;
      }, []);

      // Get the unique years from the data array
      const uniqueYears = Array.from(new Set(data.slice(1).map((row: any) => row[labelIndex])));
      const headers = [visualizationElements?.xAxis, ...uniqueYears];
      console.log('headers', headers);

      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          dimensions: headers,
          source: reformattedData,
        },
        xAxis: { type: 'category' },
        yAxis: {},
        series: headers.slice(1).map((year: any) => ({ type: 'bar' })),
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
        throw new Error('Required columns not found in data');
      }

      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        result.push({
          [visualizationElements?.xAxis as string]: xAxisValue,
          [visualizationElements?.yAxis as string]: yAxisValue,
        });
        return result;
      }, []);

      const option = {
        // legend: {},
        // tooltip: {},
        dataset: {
          source: reformattedData,
        },
        xAxis: { type: 'value', name: visualizationElements?.xAxis },
        yAxis: {
          type: 'category',
          name: visualizationElements?.yAxis,
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
        throw new Error('Required columns not found in data');
      }
      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        result.push({
          [visualizationElements?.xAxis as string]: xAxisValue,
          [visualizationElements?.yAxis as string]: yAxisValue,
        });
        return result;
      }, []);
      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          source: reformattedData,
        },
        xAxis: { type: 'value', name: visualizationElements?.xAxis },
        yAxis: { type: 'value', name: visualizationElements?.yAxis },
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
        throw new Error('Required columns not found in data');
      }

      // Unique indicator/name of values around radar chart
      const indicators = Array.from(new Set(data.slice(1).map((row: any) => row[indicatorIndex])));
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const rowIndicator = row[indicatorIndex];
        const rowLabel = row[labelIndex];
        const rowValue = row[valueIndex];

        const existingCity = result.find((item: any) => item[visualizationElements?.label as string] === rowLabel);
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
        legend: {},
        tooltip: {},
        radar: {
          indicator: indicators.map((indicator: string) => ({
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
        throw new Error('Required columns not found in data');
      }
      // get all unique x-axis values (i.e. Jan, Feb, Mar, Apr, May)
      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));
      console.log('xAxisVals', xAxisVals);
      // get all unique label names (i.e. group_A, group_B, group_C)
      const labelNames = Array.from(new Set(data.slice(1).map((row) => row[labelIndex])));
      console.log('labelNames', labelNames);
      // create new dataset that has the label name as the key, and an array of equivalent length as the xAxis as the value
      const reformattedData = labelNames.reduce((result: any, labelName) => {
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
          total: 'stack',
          data: value,
        });
      }
      const option = {
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisVals,
        },
        yAxis: {
          type: 'value',
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

      const countIndex = data[0].indexOf(visualizationElements?.count as string);
      const binIndex = data[0].indexOf(visualizationElements?.bin as string);

      if (countIndex === -1 || binIndex === -1) {
        throw new Error('Required columns not found in data');
      }

      const values = data.slice(1).map((row) => row[binIndex]) as number[];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binSize = Math.ceil((max - min) / Math.sqrt(values.length));
      const bins = [];

      for (let i = min; i <= max; i += binSize) {
        const binStart = i;
        const binEnd = i + binSize;
        const binLabel = `${binStart} - ${binEnd - 1}`;
        const numCounted = values.filter((value) => value >= binStart && value < binEnd).length;
        bins.push({
          [visualizationElements?.bin as string]: binLabel,
          [visualizationElements?.count as string]: numCounted,
        });
      }

      console.log('bins', bins);

      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          source: bins,
        },
        xAxis: { type: 'category', name: visualizationElements?.bin },
        yAxis: { type: 'value', name: visualizationElements?.count },
        series: [
          {
            type: 'bar',
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
      const countIndex = data[0].indexOf(visualizationElements?.count as string);
      const binIndex = data[0].indexOf(visualizationElements?.bin as string);
      console.log('countIndex', countIndex, 'binIndex', binIndex);
      if (countIndex === -1 || binIndex === -1) {
        throw new Error('Required columns not found in data');
      }

      const values = data.slice(1).map((row) => row[binIndex]) as number[];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binSize = Math.ceil((max - min) / Math.sqrt(values.length));
      const bins = [];

      for (let i = min; i <= max; i += binSize) {
        const binStart = i;
        const binEnd = i + binSize;
        const binLabel = `${binStart} - ${binEnd - 1}`;
        const numCounted = values.filter((value) => value >= binStart && value < binEnd).length;
        bins.push({
          [visualizationElements?.bin as string]: binLabel,
          [visualizationElements?.count as string]: numCounted,
        });
      }

      console.log('bins', bins);

      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          source: bins,
        },
        xAxis: {
          type: 'category',
          name: visualizationElements?.bin,
          boundaryGap: false,
        },
        yAxis: { type: 'value', name: visualizationElements?.count },
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
        throw new Error('Required columns not found in data');
      }

      const xAxisVals = data.slice(1).map((row) => row[xAxisIndex]);

      const positiveNegativeData: number[] = [];
      // Convert the data to positive-negative format
      // TODO: a bit gimmicky, but works for now. To revise later
      for (let i = 1; i < data.length; i++) {
        if (i === 1) {
          positiveNegativeData.push(data[i][yAxisIndex] as number);
        } else {
          positiveNegativeData.push((data[i][yAxisIndex] as number) - (data[i - 1][yAxisIndex] as number));
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
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xAxisVals,
        },
        yAxis: {
          type: 'value',
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
        throw new Error('Required columns not found in data');
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
        throw new Error('Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const series = data.slice(1).reduce((result: any[], row) => {
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
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisVals,
        },
        yAxis: {
          type: 'value',
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
        throw new Error('Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const percentages = xAxisVals.map((xAxisVal) => {
        const values = data
          .slice(1)
          .filter((row) => row[xAxisIndex] === xAxisVal)
          .map((row) => ({
            name: row[labelIndex],
            xAxisVal: row[xAxisIndex],
            yAxisVal: row[yAxisIndex],
          }));
        const total = values.reduce((acc, curr) => acc + (curr.yAxisVal as number), 0);
        return values.map(({ name, xAxisVal, yAxisVal }) => ({
          name,
          xAxisVal,
          yAxisVal: ((yAxisVal as number) / total) * 100,
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
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisVals,
        },
        yAxis: {
          type: 'value',
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
        throw new Error('Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const series = data.slice(1).reduce((result: any[], row) => {
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
      }, []);

      console.log('SERIES STACKED COLUMN CHART>', series);

      const option = {
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xAxisVals,
        },
        yAxis: {
          type: 'value',
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
        throw new Error('Required columns not found in data');
      }

      const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));

      const percentages = xAxisVals.map((xAxisVal) => {
        const values = data
          .slice(1)
          .filter((row) => row[xAxisIndex] === xAxisVal)
          .map((row) => ({
            name: row[labelIndex],
            xAxisVal: row[xAxisIndex],
            yAxisVal: row[yAxisIndex],
          }));
        const total = values.reduce((acc, curr) => acc + (curr.yAxisVal as number), 0);
        return values.map(({ name, xAxisVal, yAxisVal }) => ({
          name,
          xAxisVal,
          yAxisVal: ((yAxisVal as number) / total) * 100,
        }));
      });

      const groups = Array.from(new Set(data.slice(1).map((row) => row[labelIndex])));
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
      const series = groupedPercentages.map((group) => ({
        name: group.group,
        type: 'bar',
        stack: 'total',
        areaStyle: {},
        data: group.percentage,
        label: {
          show: true,
          formatter: (params: any) => Math.round(params.value) + '%',
        },
      }));
      const option = {
        legend: {},
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xAxisVals,
        },
        yAxis: {
          type: 'value',
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
        throw new Error('Required columns not found in data');
      }
      const xAxisName = data[0][xAxisIndex];
      const yAxisName = data[0][yAxisIndex];
      const reformattedData = data.slice(1).map((row) => [row[xAxisIndex], row[yAxisIndex], row[bubbleDiameterIndex]]);
      const bubbleDiameterSizeIndex = 2; // from reformattedData
      const option = {
        legend: {},
        tooltip: {
          formatter: (params: any) => `${visualizationElements?.bubbleDiameter}: ${params.value[2]}`,
        },
        xAxis: {
          type: 'value',
          name: xAxisName,
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
        },
        series: [
          {
            type: 'scatter',
            data: reformattedData,
            symbolSize: (data: any) => Math.sqrt(data[bubbleDiameterSizeIndex]) / 10, // ! Might need a better way to scale this
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
        throw new Error('Required columns not found in data');
      }

      function generateUniqueRandomColors(n: number) {
        const colors = new Set();
        while (colors.size < n) {
          // Generate a random color in hexadecimal format
          const color =
            '#' +
            Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, '0');
          colors.add(color);
        }
        return Array.from(colors);
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
        tooltip: {},
        xAxis: {
          scale: true,
          name: visualizationElements?.xAxis,
        },
        yAxis: {
          name: visualizationElements?.yAxis,
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
      if (!data || data.length < 1) return;
      // Find the index of parent, child, and value in the header row
      const parentIndex = data[0].indexOf(visualizationElements?.treemapParent as string | number);
      const childIndex = data[0].indexOf(visualizationElements?.treemapChild as string | number);
      const valueIndex = data[0].indexOf(visualizationElements?.value as string | number);

      // Function to generate a random color
      function getRandomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
      }

      // Function to parse array data and convert to tree structure with random colors
      function parseArrayData(data: any[]): TreeNode[] {
        const tree: Record<string, TreeNode> = {};
        const rootNodes: TreeNode[] = [];

        // Skip the header row
        for (let i = 1; i < data.length; i++) {
          const parentName = data[i][parentIndex];
          const childName = data[i][childIndex];
          const nodeValue = data[i][valueIndex];

          const node: TreeNode = {
            name: childName,
            itemStyle: {
              color: getRandomColor(),
            },
          };
          if (nodeValue !== '') node.value = parseFloat(nodeValue);
          tree[childName] = node;

          if (parentName === '') {
            rootNodes.push(node);
          } else {
            const parentNode: TreeNode =
              tree[parentName] ||
              (tree[parentName] = {
                name: parentName,
                itemStyle: { color: getRandomColor() },
              });
            if (!parentNode.children) parentNode.children = [];
            parentNode.children.push(node);
          }
        }

        return rootNodes;
      }
      // Function to get the maximum depth of the tree
      function getMaxDepth(node: any, currentDepth = 0) {
        if (!node.children || node.children.length === 0) {
          return currentDepth;
        }
        return Math.max(...node.children.map((child: any) => getMaxDepth(child, currentDepth + 1)));
      }

      // Function to generate levels based on tree depth
      function generateLevels(maxDepth: any) {
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

      // Get the maximum depth of the tree
      const maxDepth = Math.max(...treeData.map((root) => getMaxDepth(root)));

      // Generate levels based on the maximum depth
      const levels = generateLevels(maxDepth);

      // Return the configuration object
      return {
        tooltip: {
          formatter: function (info: any) {
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

      function retrieveScatterData(data: any, dimX: any, dimY: any) {
        return data.slice(1).map((item: any) => [parseFloat(item[dimX]), parseFloat(item[dimY])]);
      }

      function retrieveHistogramData(data: any, index: any) {
        const values = data.slice(1).map((row: any) => parseFloat(row[index]));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
        const binSize = (max - min) / binCount;

        const bins = Array(binCount).fill(0);
        values.forEach((value: any) => {
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
                name: schema![j].name, // ! revisit
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
                name: schema![i].name, // ! revisit
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
                data: retrieveScatterData(data, schema![j].index, schema![i].index), // ! revisit
              });

              index++;
            }
          }
        }

        // Generate histograms
        for (let i = 0; i < DIMENSION_COUNT; i++) {
          const histogramData = retrieveHistogramData(data, schema![i].index); // ! revisit

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
            name: schema![i].name, // ! revisit
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
              formatter: function (params: any) {
                const interval = histogramData[params.dataIndex].interval;
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
