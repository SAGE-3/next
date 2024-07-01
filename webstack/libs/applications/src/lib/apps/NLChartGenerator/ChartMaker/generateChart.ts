// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import stationVariableNameTranslation from '../data/kaala.json';
import { variableColors } from '../data/variableColors';

interface GenerateOptionParams {
  chartName: string;
  data: string[][];
  transformations: string[];
  stationName: string;
  colorMode: string;
  appSize: { width: number; height: number; depth: number };
  value?: string;
  indicator?: string; // for radar chart
  attributes?: string[];
  label?: string;
  bin?: string; // x-axis of histogram
  count?: string; // y-axis of histogram, what is being counted
}
type Transformation = {
  dimension: string;
  [operator: string]: string | number | Date;
};

function parseValue(value: string | number | Date): string | number | Date {
  if (isDateValid(value)) {
    return new Date(value);
  } else if (typeof value === 'string' && !isNaN(Number(value))) {
    return parseFloat(value);
  }
  return value;
}

function applyComparison(value: number, filterValue: number, operator: string): boolean {
  switch (operator) {
    case '>':
      return value > filterValue;
    case '>=':
      return value >= filterValue;
    case '<':
      return value < filterValue;
    case '<=':
      return value <= filterValue;
    case '==':
      return value == filterValue;
    case '===':
      return value === filterValue;
    case '!=':
      return value != filterValue;
    case '!==':
      return value !== filterValue;
    default:
      return true; // Return true if no operator matches
  }
}

function applyFilters(data: string | any[], extractedTransformations: Transformation[]): any[] {
  const headerRow = data[0];
  let dataRows: any[] = data.slice(1) as any[];

  extractedTransformations.forEach((filter) => {
    console.log('Filtering by', filter.dimension);

    const dimensionIndex = headerRow.findIndex((val: string) => val === filter.dimension);

    if (dimensionIndex !== -1) {
      dataRows = dataRows.filter((entry) => {
        const value = parseValue(entry[dimensionIndex]);

        // Iterate through filter conditions
        for (const operator in filter) {
          if (filter.hasOwnProperty(operator) && operator !== 'dimension') {
            const filterValue = parseValue(filter[operator]);
            if (typeof value === 'number' && typeof filterValue === 'number') {
              if (!applyComparison(value, filterValue, operator)) {
                return false;
              }
            }
          }
        }

        return true; // If no conditions fail, the entry passes this filter
      });
    }
  });

  const filteredData = [headerRow, ...dataRows];
  return filteredData;
}

export function generateOption({
  chartName,
  data,
  transformations,
  stationName,
  colorMode,
  appSize,
  value,
  indicator,
  attributes,
  label,
  bin,
  count,
}: GenerateOptionParams) {
  const extractedTransformations = extractTransformations(transformations, data);
  data = applyFilters(data, extractedTransformations);

  const chartTypes = {
    'Column Chart': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;
      const yAxis = getQuantitativeAttribute(data, attributes);
      const xAxis = getNominalAttribute(data, attributes);
      const label = getNominalAttribute(data, attributes);
      // Find the index of the xAxis, yAxis, and label in the data array
      const xAxisIndex = data[0].indexOf(xAxis as string);
      const yAxisIndex = data[0].indexOf(yAxis as string);
      const labelIndex = data[0].indexOf(label as string);

      // Check if the required columns exist in the data array
      if (xAxisIndex === -1 || yAxisIndex === -1 || labelIndex === -1) {
        console.log('Required columns not found in data');
        return {};
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
      const headers = [xAxis, ...uniqueYears];

      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          dimensions: headers,
          source: reformattedData,
        },
        xAxis: { type: 'category', name: xAxis },
        yAxis: { name: yAxis },
        series: headers.slice(1).map((year: any) => ({ type: 'bar' })),
      };

      return option;
    },

    'Bar Chart': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;

      const xAxis = getNominalAttribute(data, attributes);
      const yAxis = getQuantitativeAttribute(data, attributes);

      const xAxisIndex = data[0].indexOf(xAxis as string);
      const yAxisIndex = data[0].indexOf(yAxis as string);

      if (xAxisIndex === -1 || yAxisIndex === -1) {
        console.log('Required columns not found in data');
        return {};
      }
      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        result.push({
          [xAxis as string]: xAxisValue,
          [yAxis as string]: yAxisValue,
        });
        return result;
      }, []);

      const option = {
        // legend: {},
        // tooltip: {},
        dataset: {
          source: reformattedData,
        },
        xAxis: { type: 'value', name: xAxis },
        yAxis: { type: 'category', name: yAxis },
        series: [
          {
            type: 'bar',
          },
        ],
      };

      return option;
    },

    'Scatter Chart': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;

      const multipleQuantitativeAttributes = getMultipleQuantitativeAttributes(data, attributes);
      if (multipleQuantitativeAttributes === -1) {
        console.log('Required columns not found in data');
        return {};
      } else if (multipleQuantitativeAttributes.length < 2) {
        console.log('Need at least two quantitative attributes');
        return {};
      }
      const xAxis = multipleQuantitativeAttributes[0];
      const yAxis = multipleQuantitativeAttributes[1];
      const label = getNominalAttribute(data, attributes);
      let labelIndex = -1;
      if (label) {
        labelIndex = data[0].indexOf(label as string);
      }
      const xAxisIndex = data[0].indexOf(xAxis as string);
      const yAxisIndex = data[0].indexOf(yAxis as string);

      if (xAxisIndex === -1 || yAxisIndex === -1) {
        console.log('Required columns not found in data');
        return {};
      }

      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const xAxisValue = row[xAxisIndex];
        const yAxisValue = row[yAxisIndex];
        let labelValue: string | number = -1;
        if (labelIndex !== -1) {
          labelValue = row[labelIndex];
        }
        result.push({
          [xAxis as string]: xAxisValue,
          [yAxis as string]: yAxisValue,
          [label as string]: labelValue,
        });
        return result;
      }, []);

      const xAxisMin = Math.min(
        ...reformattedData
          .filter((item) => item[xAxis] !== undefined && item[xAxis] !== null && item[xAxis] !== '')
          .map((item) => item[xAxis])
      );
      const yAxisMin = Math.min(
        ...reformattedData
          .filter((item) => item[yAxis] !== undefined && item[yAxis] !== null && item[yAxis] !== '')
          .map((item) => item[yAxis])
      );

      const option = {
        legend: {},
        tooltip:
          label === -1
            ? {}
            : {
                formatter: function (params: { seriesName: any; data: { [x: string]: any } }) {
                  return `${params.seriesName}: (${params.data[xAxis]}, ${params.data[yAxis]})<br>${label}: ${params.data[label]}`;
                },
              },
        dataset: [
          {
            source: reformattedData,
          },
        ],
        xAxis: {
          type: 'value',
          name: xAxis,
          min: xAxisMin,
        },
        yAxis: {
          type: 'value',
          name: yAxis,
          min: yAxisMin,
        },
        series: [
          {
            type: 'scatter',
          },
        ],
      };
      return option;
    },
    'Bubble Chart': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;

      const xAxis = getQuantitativeAttribute(data, attributes);
      const yAxis = getQuantitativeAttribute(data, attributes);
      const zAxis = getQuantitativeAttribute(data, attributes);
      const label = getNominalAttribute(data, attributes);

      const xAxisIndex = data[0].indexOf(xAxis as string);
      const yAxisIndex = data[0].indexOf(yAxis as string);
      const zAxisIndex = data[0].indexOf(zAxis as string);
      let labelIndex = -1;
      if (label) {
        labelIndex = data[0].indexOf(label as string);
      }

      if (xAxisIndex === -1 || yAxisIndex === -1) {
        console.log('Required columns not found in data');
        return {};
      }
      // Reduce the data array to reformat it
      const reformattedData = data.slice(1).map((row) => ({
        [xAxis as string]: row[xAxisIndex],
        [yAxis as string]: row[yAxisIndex],
        [zAxis as string]: row[zAxisIndex],
        [label as string]: row[labelIndex],
      }));
      const option = {
        //TODO write code to draw labels on charts
        legend: {},
        tooltip:
          label === -1
            ? {}
            : {
                formatter: function (params: { seriesName: any; data: { [x: string]: any } }) {
                  return `${params.seriesName}: (${params.data[xAxis]}, ${params.data[yAxis]})<br>${label}: ${params.data[label]}`;
                },
              },
        dataset: {
          source: reformattedData,
        },
        xAxis: { type: 'value', name: xAxis },
        yAxis: { type: 'value', name: yAxis },
        visualMap: {
          //@ts-ignore
          min: Math.min(...reformattedData.map((item) => item[zAxis])), //@ts-ignore
          max: Math.max(...reformattedData.map((item) => item[zAxis])),
          dimension: zAxis,
          inRange: {
            symbolSize: [10, 50],
          },
          seriesIndex: 0,
        },
        series: [
          {
            type: 'scatter',
            name: 'Data Points', // Set the series name for tooltip
            //@ts-ignore
            symbolSize: function (data) {
              return Math.sqrt(data[zAxis]) * 10;
            },
            label: {
              show: false, // Hide default label
            },
          },
        ],
      };
      return option;
    },

    'Circular Area Chart': ({
      //TODO FIX THIS
      data,
      indicator,
      label,
      value,
    }: Partial<GenerateOptionParams>) => {
      if (!data) return;
      // Find the index of the indicator, label, and value in the data array
      const indicatorIndex = data[0].indexOf(indicator as string);
      const labelIndex = data[0].indexOf(label as string);
      const valueIndex = data[0].indexOf(value as string);

      if (indicatorIndex === -1 || labelIndex === -1) {
        console.log('Required columns not found in data');
        return {};
      }

      // Unique indicator/name of values around radar chart
      const indicators = Array.from(new Set(data.slice(1).map((row: any) => row[indicatorIndex])));
      const reformattedData = data.slice(1).reduce((result: any[], row) => {
        const rowIndicator = row[indicatorIndex];
        const rowLabel = row[labelIndex];
        const rowValue = row[valueIndex];

        const existingCity = result.find((item: any) => item[label as string] === rowLabel);
        if (existingCity) {
          existingCity[rowIndicator] = rowValue;
        } else {
          result.push({
            [label as string]: rowLabel,
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
          name: city[label as string],
          type: 'radar',
          data: [
            {
              value: Object.values(city).slice(1),
              name: city[label as string],
            },
          ],
        })),
      };
      return option;
    },

    // "Line Chart": ({ data, attributes }: Partial<GenerateOptionParams>) => {
    //   if (!data || !attributes) return;

    //   const xAxis = getTemporalAttribute(data, attributes);
    //   const yAxis = getQuantitativeAttribute(data, attributes);
    //   const label = getNominalAttribute(data, attributes);
    //   const xAxisIndex = data[0].indexOf(xAxis as string);
    //   const yAxisIndex = data[0].indexOf(yAxis as string);
    //   console.log(xAxis, yAxis, label, "*********~~~***");
    //   let labelIndex = -1;
    //   if (label) {
    //     labelIndex = data[0].indexOf(label as string);
    //   }
    //   if (xAxisIndex === -1 || yAxisIndex === -1) {
    //     console.log("Required columns not found in data");
    //     return {};
    //   }
    //   // get all unique x-axis values (i.e. Jan, Feb, Mar, Apr, May)
    //   const xAxisVals = Array.from(
    //     new Set(data.slice(1).map((row) => row[xAxisIndex]))
    //   );
    //   const yAxisVals = data.slice(1).map((row) => row[yAxisIndex]);

    //   // console.log("xAxisVals", xAxisVals);
    //   // get all unique label names (i.e. group_A, group_B, group_C)
    //   let labelNames: (string | number)[] | number = -1;
    //   if (labelIndex !== -1) {
    //     labelNames = Array.from(
    //       new Set(data.slice(1).map((row) => row[labelIndex]))
    //     );
    //   }

    //   // create new dataset that has the label name as the key, and an array of equivalent length as the xAxis as the value
    //   if (labelNames !== -1) {
    //     const reformattedData = labelNames.reduce((result: any, labelName) => {
    //       result[labelName] = new Array(xAxisVals.length).fill(0);
    //       return result;
    //     }, {});
    //     // iterate through each row's yAxis value and add it at the right index of the array
    //     for (let i = 1; i < data.length; i++) {
    //       const row = data[i];
    //       const labelName = row[labelIndex];
    //       const xAxisValue = row[xAxisIndex];
    //       const yAxisValue = row[yAxisIndex];
    //       const xAxisValueIndex = xAxisVals.indexOf(xAxisValue);
    //       reformattedData[labelName][xAxisValueIndex] = yAxisValue;
    //     }
    //     const reformattedSeries = [];
    //     for (const [key, value] of Object.entries(reformattedData)) {
    //       reformattedSeries.push({
    //         name: key,
    //         type: "line",
    //         total: "stack",
    //         data: value,
    //       });
    //     }
    //     const option = {
    //       legend: {},
    //       tooltip: {},
    //       xAxis: {
    //         type: "category",
    //         boundaryGap: false,
    //         data: xAxisVals,
    //       },
    //       yAxis: {
    //         type: "value",
    //       },
    //       series: reformattedSeries,
    //     };
    //     return option;
    //   } else {
    //     const option = {
    //       legend: {},
    //       tooltip: {},
    //       xAxis: {
    //         type: "category",
    //         data: xAxisVals,
    //       },
    //       yAxis: {
    //         type: "value",
    //       },
    //       series: [
    //         {
    //           type: "line",
    //           data: yAxisVals,
    //         },
    //       ],
    //     };
    //     return option;
    //   }
    // },
    'Line Chart': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;
      const xAxis = getTemporalAttribute(data, attributes);

      const labels = getMultipleQuantitativeAttributes(data, attributes);

      let yAxisIndices: number[] = [];
      if (xAxis === -1 || labels === -1) {
        console.log('Required columns not found in data');
        return {};
      } else {
        for (let i = 0; i < labels.length; i++) {
          yAxisIndices.push(data[0].indexOf(labels[i] as string));
        }
        const xAxisIndex = data[0].indexOf(xAxis as string);
        // get all unique x-axis values (i.e. Jan, Feb, Mar, Apr, May)
        const xAxisVals = Array.from(new Set(data.slice(1).map((row) => row[xAxisIndex])));
        const yAxisValsArray = [];
        for (let i = 0; i < labels.length; i++) {
          yAxisValsArray.push(data.slice(1).map((row) => row[yAxisIndices[i]]));
        }
        const series = [];
        const legend = [];
        for (let i = 0; i < labels.length; i++) {
          let color = '#eee';
          for (let j = 0; j < stationVariableNameTranslation.length; j++) {
            if (stationVariableNameTranslation[j].var_id == labels[i]) {
              for (let k = 0; k < variableColors.length; k++) {
                if (stationVariableNameTranslation[j].var_name == variableColors[k].variableName) {
                  color = variableColors[k].variableColor;
                  break;
                }
              }
              break;
            }
          }
          series.push({
            name: labels[i],
            type: 'line',
            data: yAxisValsArray[i],
            itemStyle: {
              color: color,
            },
          });
          legend.push(labels[i]);
        }
        const option = {
          legend: {
            data: legend,
          },
          tooltip: {},
          xAxis: {
            type: 'category',
            data: xAxisVals,
            name: xAxis,
          },
          yAxis: {
            type: 'value',
          },
          series: series,
        };
        return option;
      }
    },
    'Column Histogram': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;

      const bin = getQuantitativeAttribute(data, attributes);
      const xAxisIndex = data[0].indexOf(bin as string);

      if (xAxisIndex === -1) {
        console.log('Required columns not found in data');
        return {};
      }

      const values = data.slice(1).map((row) => row[xAxisIndex]) as number[];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.ceil(Math.sqrt(values.length));
      const binSize = (max - min) / binCount;
      const bins = [];
      const count = 'count';

      for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        const binLabel = `${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`;
        const numCounted = values.filter((value) => value >= binStart && value < binEnd).length;
        bins.push({
          [bin as string]: binLabel,
          [count as string]: numCounted,
        });
      }

      // Ensure the last bin includes the maximum value
      bins[bins.length - 1][count as string] += values.filter((value) => value === max).length;

      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          source: bins,
        },
        xAxis: { type: 'category', name: bin },
        yAxis: { type: 'value', name: count },
        series: [
          {
            type: 'bar',
          },
        ],
      };
      return option;
    },

    'Line Histogram': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      //TODO fix this
      if (!data || !attributes) return;

      const bin = getQuantitativeAttribute(data, attributes);
      const xAxisIndex = data[0].indexOf(bin as string);

      if (xAxisIndex === -1) {
        console.log('Required columns not found in data');
        return {};
      }

      const values = data.slice(1).map((row) => row[xAxisIndex]) as number[];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binSize = Math.ceil((max - min) / Math.sqrt(values.length));
      const bins = [];
      const count = 'count';

      for (let i = min; i <= max; i += binSize) {
        const binStart = i;
        const binEnd = i + binSize;
        const binLabel = `${binStart} - ${binEnd - 1}`;
        const numCounted = values.filter((value) => value >= binStart && value < binEnd).length;
        bins.push({ [bin as string]: binLabel, [count as string]: numCounted });
      }

      const option = {
        legend: {},
        tooltip: {},
        dataset: {
          source: bins,
        },
        xAxis: { type: 'category', name: bin, boundaryGap: false },
        yAxis: { type: 'value', name: count },
        series: [
          {
            type: 'line',
            smooth: 'true',
          },
        ],
      };
      return option;
    },

    'Waterfall Chart': ({ data, attributes }: Partial<GenerateOptionParams>) => {
      if (!data || !attributes) return;

      const xAxis = getNominalAttribute(data, attributes);
      const yAxis = getQuantitativeAttribute(data, attributes);
      const xAxisIndex = data[0].indexOf(xAxis as string);
      const yAxisIndex = data[0].indexOf(yAxis as string);
      if (xAxisIndex === -1 || yAxisIndex === -1) {
        console.log('Required columns not found in data');
        return {};
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
          name: xAxis,
        },
        yAxis: {
          type: 'value',
          name: yAxis,
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

    'Pie Chart': ({ data, value, label }: Partial<GenerateOptionParams>) => {
      //TODO fix this
      if (!data) return;
      const valueIndex = data[0].indexOf(value as string);
      const labelIndex = data[0].indexOf(label as string);

      if (valueIndex === -1 || labelIndex === -1) {
        console.log('Required columns not found in data');
        return {};
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
  };
  let option = chartTypes[chartName as keyof typeof chartTypes]
    ? chartTypes[chartName as keyof typeof chartTypes]({
        data,
        value,
        indicator,
        attributes,
        label,
        bin,
        count,
      })
    : {};
  console.log(option);
  if (JSON.stringify(option) == JSON.stringify({})) {
    return {};
  }

  option = createTitle(option, chartName, stationName, data);
  option = customizeChart(option, colorMode);
  option = customizeLegend(option);
  option = createTooltip(option, colorMode);
  option = customizeXAxis(option, appSize, data);
  option = customizeYAxis(option, appSize, data);
  return option;
}

const customizeYAxis = (option, appSize, data) => {
  option.yAxis = {
    ...option.yAxis,
    axisLabel: {
      fontSize: 25,
    },
  };
  return option;
};

const customizeXAxis = (option, appSize, data) => {
  // const interval = Math.floor((250 / appSize.width) * data.length);
  // TODO fix this later. Need to update according to app size of chart that was generated,

  option.xAxis = {
    ...option.xAxis,
    nameLocation: 'middle',
    nameTextStyle: {
      fontSize: 20, // Increase the font size here
      fontWeight: 'bold', // Customize the style of the title (optional)
    },
    axisLabel: {
      fontSize: 15,
      margin: 25,
      // interval: 30,
      rotate: 30,
    },
    nameGap: 300,
  };
  return option;
};

const customizeLegend = (option) => {
  option.legend = {
    bottom: '0%',
  };
  return option;
};

const createTooltip = (option: EChartsOption, colorMode: string) => {
  option.tooltip = {
    show: true,
    trigger: 'axis',
    textStyle: {
      fontSize: 40,
      color: colorMode === 'dark' ? '#fff' : '#000',
    },
    borderWidth: 3,
    backgroundColor: colorMode === 'dark' ? '#555' : '#fff',
  };
  return option;
};

const createTitle = (option, chartName, stationName, data) => {
  const headers = data[0];
  const headersWithFullName = [];
  let startDate = '';
  let endDate = '';
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] == 'Date') {
      startDate = data[1][i];
      endDate = data[data.length - 1][i];
    }
  }
  for (let i = 0; i < headers.length; i++) {
    for (let j = 0; j < stationVariableNameTranslation.length; j++) {
      if (headers[i] == stationVariableNameTranslation[j]['var_id']) {
        headersWithFullName.push(stationVariableNameTranslation[j]['var_name']);
      }
    }
  }

  const chartTitle = `${chartName} of ${headersWithFullName.join(', ')} for ${stationName} in ${startDate} to ${endDate}`;
  option.title = {
    text: chartTitle,
    left: 'center',
  };
  return option;
};

const getNominalAttribute = (data: (string | number)[][], attributes: any[]) => {
  let nominalIndex = -1;
  for (let i = 0; i < data[0].length; i++) {
    for (let j = 0; j < attributes.length; j++) {
      if (data[0][i] === attributes[j]) {
        //@ts-ignore
        if (isNaN(data[1][i]) && !isDateValid(data[1][i])) {
          nominalIndex = i;
          break;
        }
      }
    }
    if (nominalIndex !== -1) break;
  }

  if (nominalIndex === -1) {
    console.log('No Nominal Attribute');
    return -1;
  } else {
    // const removeIndex = attributes.findIndex(
    //   (attr) => attr === data[0][nominalIndex]
    // );
    // attributes[removeIndex] = "";
    return data[0][nominalIndex];
  }
};

const getQuantitativeAttribute = (data: (string | number)[][], attributes: string[]) => {
  let quantitativeIndex = -1;
  for (let i = 0; i < data[0].length; i++) {
    for (let j = 0; j < attributes.length; j++) {
      if (data[0][i] === attributes[j]) {
        //@ts-ignore
        if (!isNaN(data[1][i])) {
          quantitativeIndex = i;
          break;
        }
      }
    }
    if (quantitativeIndex !== -1) break;
  }

  if (quantitativeIndex === -1) {
    console.log('No Nominal Attribute');
    return -1;
  } else {
    // const removeIndex = attributes.findIndex(
    //   (attr) => attr === data[0][quantitativeIndex]
    // );
    // attributes[removeIndex] = "";
    return data[0][quantitativeIndex];
  }
};

function isDateValid(value: string | number | Date) {
  // Check if the value is a string
  if (typeof value !== 'string') return false;

  // Check if the parsed value is a valid date
  const parsedDate = new Date(value);
  if (/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(value)) {
    return true;
  }
  console.log(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(value));
  return !isNaN(parsedDate) && /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(value);
}

const getTemporalAttribute = (data: (string | number)[][], attributes: string[]) => {
  let temporalIndex = -1;
  for (let i = 0; i < data[0].length; i++) {
    if (isDateValid(data[1][i]) || data[1][i] === 'Jan') {
      temporalIndex = i;
      break;
    }
  }

  if (temporalIndex === -1) {
    console.log('No Temporal Attribute');
    return -1;
  } else {
    // const removeIndex = attributes.findIndex(
    //   (attr) => attr === data[0][temporalIndex]
    // );
    // attributes[removeIndex] = "";
    return data[0][temporalIndex];
  }
};

const getMultipleQuantitativeAttributes = (data: (string | number)[][] | { [x: string]: any }[], attributes: any[]) => {
  const quantitativeIndices: string | number | number[] = [];
  const quantitativeAttributes: string[] = [];
  for (let i = 0; i < data[0].length; i++) {
    for (let j = 0; j < attributes.length; j++) {
      if (data[0][i] === attributes[j]) {
        //@ts-ignore
        if (!isNaN(data[1][i]) && !isDateValid(data[1][i])) {
          quantitativeIndices.push(i);
          quantitativeAttributes.push(attributes[j]);
        }
      }
    }
  }
  if (quantitativeIndices.length === 0) {
    console.log('No Quantitative Attribute');
    return -1;
  } else {
    // for (let i = 0; i < quantitativeIndices.length; i++) {
    //   attributes[quantitativeIndices[i]] = "";
    // }

    return quantitativeAttributes;
  }
};

interface LooseObject {
  [key: string]: any;
}
const operatorRegex = /([><]=?|==)\s*(.*)$/;

const extractTransformations = (transformations: string[], data: string[][]) => {
  const attributeHeaders = data[0];
  const extractedTransformations = [];
  for (let i = 0; i < attributeHeaders.length; i++) {
    for (let j = 0; j < transformations.length; j++) {
      if (transformations[j].includes(attributeHeaders[i])) {
        const transform: LooseObject = {};
        transform.dimension = attributeHeaders[i];
        const match = transformations[j].match(operatorRegex);
        if (match && match[1] && match[2]) {
          transform[match[1]] = match[2];
          extractedTransformations.push(transform);
        }
      }
    }
  }
  return extractedTransformations;
};

function customizeChart(options: EChartsOption, colorMode: string) {
  // Set the color mode
  if (colorMode === 'dark') {
    options.backgroundColor = '#222';
    options.textStyle = { color: '#ffffff' };
    options.axisLine = { lineStyle: { color: '#eee' } };
    options.tooltip = { backgroundColor: '#333', textStyle: { color: '#eee' } };
    options.grid = {
      bottom: 100, // Increase this value to provide more space for x-axis labels
      left: 150, // Increase this value to provide more space for x-axis labels
    };
  } else if (colorMode === 'light') {
    options.backgroundColor = '#fff';
    options.textStyle = { color: '#333' };
    options.axisLine = { lineStyle: { color: '#999' } };
    options.tooltip = { backgroundColor: '#fff', textStyle: { color: '#333' } };
    options.grid = {
      bottom: 100, // Increase this value to provide more space for x-axis labels
      left: 150, // Increase this value to provide more space for x-axis labels
    };
  } else {
    throw new Error('Invalid color mode');
  }

  // Return the modified options object
  return options;
}
