import stationVariableNameTranslation from '../data/kaala.json';
import { variableColors } from '../data/variableColors';
import { EChartsCoreOption, dataTool } from 'echarts';
import { stationData } from '../data/stationData';

interface GenerateOptionParams {
  chartName: string;
  data: any;
  attributes: string[];
  transformations: string[];
  colorMode: string;
  appSize: { width: number; height: number; depth: number };
  // value?: string;
  // indicator?: string; // for radar chart
  // label?: string;
  // bin?: string; // x-axis of histogram
  // count?: string; // y-axis of histogram, what is being counted
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
const color = ['#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622', '#bda29a', '#6e7074', '#546570', '#c4ccd3'];

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
  attributes,
  transformations,
  colorMode,
  appSize,
}: GenerateOptionParams): EChartsCoreOption[] {
  const extractedTransformations: Transformation[] = extractTransformations(transformations, data[0]['data']);
  console.log(extractedTransformations);
  for (let i = 0; i < data.length; i++) {
    data[i]['data'] = applyFilters(data[i]['data'], extractedTransformations);
  }
  const quantitativeAttributes = getMultipleQuantitativeAttributes(data[0]['data'], attributes);
  const quantitativeAttributesFullName = [];
  for (let i = 0; i < quantitativeAttributes.length; i++) {
    for (let j = 0; j < stationVariableNameTranslation.length; j++) {
      if (quantitativeAttributes[i] == stationVariableNameTranslation[j]['var_id']) {
        quantitativeAttributesFullName.push(stationVariableNameTranslation[j]['var_name']);
      }
    }
  }
  const temporalAttribute = getTemporalAttribute(data[0]['data'], attributes);
  const chartOptions: EChartsCoreOption[] = [];
  const series = [];
  switch (chartName) {
    case 'Line Chart':
      for (let i = 0; i < quantitativeAttributes.length; i++) {
        let chartOption: any = {};
        const series = [];

        if (!temporalAttribute) {
          console.log('No temporal attribute');
          return [];
        }

        const xAxisIndex = data[0]['data'][0].indexOf(temporalAttribute as string);
        const xAxisVals = Array.from(new Set(data[0]['data'].slice(1).map((row: { [x: string]: any }) => row[xAxisIndex])));

        for (let j = 0; j < data.length; j++) {
          const stationSeries: any = {};
          const attributeIndex = data[j]['data'][0].indexOf(quantitativeAttributes[i] as string);
          let stationColor = '#000';
          stationSeries.name = data[j]['stationName'];
          for (let k = 0; k < stationData.length; k++) {
            if (data[j]['stationName'] == stationData[k].stationName) {
              stationColor = stationData[k].color;
              break;
            }
          }
          stationSeries.type = 'line';
          (stationSeries.itemStyle = {
            color: stationColor,
          }),
            (stationSeries.data = data[j]['data'].slice(1).map((row: { [x: string]: any }) => row[attributeIndex]));
          series.push(stationSeries);
        }

        chartOption.series = series;
        chartOption.xAxis = {
          type: 'category',
          data: xAxisVals,
          name: temporalAttribute,
        };
        chartOption.yAxis = {
          type: 'value',
          name: quantitativeAttributesFullName[i],
        };

        chartOption = createTitle(chartOption, chartName, data, data[0]['data'], [quantitativeAttributes[i]]);
        chartOption = customizeChart(chartOption, colorMode);
        chartOption = customizeLegend(chartOption);
        chartOption = createTooltip(chartOption, colorMode);
        chartOption = customizeXAxis(chartOption, appSize, data);
        chartOption = customizeYAxis(chartOption, appSize, data);
        chartOptions.push(chartOption);
      }

      break;

    case 'Scatter Chart':
      if (quantitativeAttributes.length >= 2) {
        for (let i = 1; i < quantitativeAttributes.length; i++) {
          let chartOption: any = {};

          //create scatter chart
          const xAxis = quantitativeAttributes[0];
          const yAxis = quantitativeAttributes[i];
          const xAxisFullName = quantitativeAttributesFullName[0];
          const yAxisFullName = quantitativeAttributesFullName[i];
          const tmpStationSeries = [];
          console.log(data, 'data');
          for (let i = 0; i < data.length; i++) {
            const stationSeries: any = {};
            let stationColor = '#000';
            stationSeries.name = data[i]['stationName'];
            for (let j = 0; j < stationData.length; j++) {
              if (data[i]['stationName'] == stationData[j].stationName) {
                stationColor = stationData[j].color;
                break;
              }
            }
            stationSeries.type = 'scatter';
            stationSeries.emphasis = {
              focus: 'series',
            };
            const xAxisIndex = data[i]['data'][0].indexOf(xAxis as string);
            const yAxisIndex = data[i]['data'][0].indexOf(yAxis as string);
            if (xAxisIndex === -1 || yAxisIndex === -1) {
              console.log('Required columns not found in data');
              return [];
            }
            // Reduce the data array to reformat it
            const reformattedData = data[i]['data'].slice(1).reduce((result: any[], row: { [x: string]: any }) => {
              const xAxisValue = row[xAxisIndex];
              const yAxisValue = row[yAxisIndex];
              // let labelValue: string | number = -1;
              // if (labelIndex !== -1) {
              //   labelValue = row[labelIndex];
              // }
              result.push({
                [xAxis as string]: xAxisValue,
                [yAxis as string]: yAxisValue,
                label: data[i]['stationName'],
              });
              return result;
            }, []);
            const transformedData = reformattedData.map((item: { [x: string]: any }) => [item[xAxis], item[yAxis]]);

            stationSeries.data = transformedData;
            stationSeries.itemStyle = {
              color: 'transparent',
              borderColor: stationColor,
              borderWidth: 2,
            };
            stationSeries.symbolSize = 10;

            tmpStationSeries.push(stationSeries);
          }
          chartOption.series = tmpStationSeries;
          chartOption.xAxis = {
            type: 'value',
            name: xAxisFullName,
          };
          chartOption.yAxis = {
            type: 'value',
            name: yAxisFullName,
          };
          chartOption = createTitle(chartOption, chartName, data, data[0]['data'], [quantitativeAttributes[0], quantitativeAttributes[i]]);
          chartOption = customizeChart(chartOption, colorMode);
          chartOption = customizeLegend(chartOption);
          chartOption = createTooltip(chartOption, colorMode);
          chartOption = customizeXAxis(chartOption, appSize, data);
          chartOption = customizeYAxis(chartOption, appSize, data);
          chartOptions.push(chartOption);
        }
      } else {
        console.log(quantitativeAttributes);
        console.log('Not enough or too many attributes. Error in scatter chart');
        return [];
      }

      break;
    case 'Pie Chart': {
      const tmpStationData = [];
      for (let i = 0; i < quantitativeAttributes.length; i++) {
        let chartOption: any = {};

        const axis = quantitativeAttributes[i];

        for (let j = 0; j < data.length; j++) {
          let totalData = 0;
          const axisIndex = data[j]['data'][0].indexOf(axis as string);
          if (axisIndex) {
            for (let k = 1; k < data[j]['data'].length; k++) {
              totalData += data[j]['data'][k][axisIndex];
            }
            let stationColor = '#000';
            for (let k = 0; k < stationData.length; k++) {
              if (data[j]['stationName'] == stationData[k].stationName) {
                stationColor = stationData[j].color;
                break;
              }
            }
            tmpStationData.push({ value: totalData.toFixed(1), name: data[j]['stationName'], itemStyle: { color: stationColor } });
          }
        }
        chartOption.series = [
          {
            name: quantitativeAttributes,
            type: 'pie',
            radius: '50%',
            data: tmpStationData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            label: {
              fontSize: 20, // Increase the font size here
            },
          },
        ];
        chartOption = createTitle(chartOption, chartName, data, data[0]['data'], [quantitativeAttributes[i]]);
        chartOption = customizeChart(chartOption, colorMode);
        chartOption = customizeLegend(chartOption);
        chartOption = createTooltip(chartOption, colorMode);
        chartOption.tooltip.trigger = 'item';
        chartOption = customizeXAxis(chartOption, appSize, data);
        chartOption = customizeYAxis(chartOption, appSize, data);
        chartOptions.push(chartOption);
      }

      break;
    }
    case 'Boxplot': {
      for (let i = 0; i < quantitativeAttributes.length; i++) {
        let chartOption: any = {};

        const attribute = quantitativeAttributes[i];
        const boxplotData = [];
        const categories: string[] = [];

        for (let j = 0; j < data.length; j++) {
          const stationName = data[j]['stationName'];
          categories.push(stationName);
          const tmpStationData = data[j]['data'].slice(1).map((row: { [x: string]: any }) => row[data[j]['data'][0].indexOf(attribute)]);
          console.log(attribute, data);

          tmpStationData.sort((a: number, b: number) => a - b);
          const q1 = tmpStationData[Math.floor(tmpStationData.length / 4)];
          const median = tmpStationData[Math.floor(tmpStationData.length / 2)];
          const q3 = tmpStationData[Math.floor((tmpStationData.length * 3) / 4)];
          const min = tmpStationData[0];
          const max = tmpStationData[tmpStationData.length - 1];

          boxplotData.push([min, q1, median, q3, max]);
        }

        chartOption.series = [
          {
            name: attribute,
            type: 'boxplot',
            data: boxplotData,
          },
        ];
        chartOption.xAxis = {
          type: 'category',
          data: categories,
          name: 'Stations',
        };
        chartOption.yAxis = {
          type: 'value',
          name: quantitativeAttributesFullName[i],
        };
        chartOption = createTitle(chartOption, chartName, data, data[0]['data'], [attribute]);
        chartOption = customizeChart(chartOption, colorMode);
        chartOption = customizeLegend(chartOption);
        chartOption = createTooltip(chartOption, colorMode);
        chartOption = customizeXAxis(chartOption, appSize, data);
        chartOption = customizeYAxis(chartOption, appSize, data);
        chartOptions.push(chartOption);
      }
      break;
    }

    case 'Column Histogram': {
      for (let i = 0; i < quantitativeAttributes.length; i++) {
        const attribute = quantitativeAttributes[i];

        for (let j = 0; j < data.length; j++) {
          let chartOption: any = {};

          const stationName = data[j]['stationName'];
          const histogramData = [];
          const binCounts: any = {};
          const numBins = 10; // You can adjust the number of bins

          let minValue = Infinity;
          let maxValue = -Infinity;

          // Find min and max values for the current attribute across the current station
          const tmpStationData = data[j]['data'].slice(1).map((row: { [x: string]: any }) => row[data[j]['data'][0].indexOf(attribute)]);

          tmpStationData.forEach((value: number) => {
            if (value < minValue) {
              minValue = value;
            }
            if (value > maxValue) {
              maxValue = value;
            }
          });

          // Calculate bin counts for the current station
          tmpStationData.forEach((value: number) => {
            const bin = Math.floor((value - minValue) / ((maxValue - minValue) / numBins)); // Calculate bin index
            if (!binCounts[bin]) {
              binCounts[bin] = 0;
            }
            binCounts[bin]++;
          });

          // Prepare data for the histogram
          for (const bin in binCounts) {
            histogramData.push([parseFloat(bin) * ((maxValue - minValue) / numBins) + minValue, binCounts[bin]]);
          }

          histogramData.sort((a, b) => a[0] - b[0]);

          // Find the corresponding color for the current station
          const stationColor = stationData.find((s) => s.stationName === stationName)?.color || '#000';
          console.log(stationColor);

          chartOption.series = [
            {
              name: stationName,
              type: 'bar',
              data: histogramData.map((item) => ({ value: item[1], name: item[0].toFixed(2) })),
              barWidth: '99.3%',
              barGap: '-100%',
              itemStyle: {
                color: stationColor,
              },
            },
          ];
          chartOption.xAxis = {
            type: 'category',
            data: histogramData.map((item) => item[0].toFixed(2)),
            name: quantitativeAttributesFullName[i],
          };
          chartOption.yAxis = {
            type: 'value',
            name: '# of Occurances',
          };
          chartOption = createTitle(chartOption, chartName, [{ stationName: stationName }], data[j]['data'], [attribute]);
          chartOption = customizeChart(chartOption, colorMode);
          chartOption = customizeLegend(chartOption);
          chartOption = createTooltip(chartOption, colorMode);
          chartOption = customizeXAxis(chartOption, appSize, data);
          chartOption = customizeYAxis(chartOption, appSize, data);
          chartOptions.push(chartOption);
        }
      }
      break;
    }

    default:
      return [];
  }

  return chartOptions;
}

const customizeYAxis = (option: { yAxis: any }, appSize: { width: number; height: number; depth: number }, data: any) => {
  option.yAxis = {
    ...option.yAxis,
    nameTextStyle: {
      fontSize: 35, // Increase the font size here
      fontWeight: 'bold', // Customize the style of the title (optional)
    },
    axisLabel: {
      fontSize: 25,
    },
  };
  return option;
};

const customizeXAxis = (option: { xAxis: any }, appSize: { width: number; height: number; depth: number }, data: any) => {
  // const interval = Math.floor((250 / appSize.width) * data.length);
  // TODO fix this later. Need to update according to app size of chart that was generated,

  option.xAxis = {
    ...option.xAxis,
    nameLocation: 'end',
    nameTextStyle: {
      fontSize: 25, // Increase the font size here
      fontWeight: 'bold', // Customize the style of the title (optional)
    },
    axisLabel: {
      fontSize: 20,
      margin: 25,
      // interval: 30,
      rotate: 30,
    },
  };
  return option;
};

const customizeLegend = (option: { legend: { bottom: string } }) => {
  option.legend = {
    bottom: '0%',
  };
  return option;
};

const createTooltip = (option: EChartsCoreOption, colorMode: string) => {
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

const createTitle = (
  option: { title: { text: string; left: string } },
  chartName: string,
  stationData: any,
  data: string | any[],
  headers: string[]
) => {
  const stationNames = stationData.map((val: { [x: string]: any }) => val['stationName'].split(' ')[1]);
  console.log(stationData, stationNames);
  const headerIds = data[0];
  const headersWithFullName = [];
  let startDate = '';
  let endDate = '';
  for (let i = 0; i < headerIds.length; i++) {
    if (headerIds[i] == 'Date') {
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

  const chartTitle = `${chartName} of ${headersWithFullName.join(', ')} for Stations: ${stationNames.join(
    ', '
  )} from ${startDate} to ${endDate}`;
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

function isDateValid(value: string | number | Date) {
  // Check if the value is a string
  if (typeof value !== 'string') return false;

  // Check if the parsed value is a valid date
  const parsedDate = new Date(value);
  if (/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(value)) {
    return true;
  }
  //@ts-ignore
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
      if (!data[0]) {
        return [];
      }
      //@ts-ignore
      if (data[0][i] === attributes[j]) {
        if (!data[1]) {
          return [];
        }
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
    return [];
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
        const transform: any = {};
        transform.dimension = attributeHeaders[i];
        const match = transformations[j].match(operatorRegex);
        console.log('match', match);
        if (match && match[1] && match[2]) {
          transform[match[1]] = match[2];
          extractedTransformations.push(transform);
        }
      }
    }
  }
  return extractedTransformations;
};

function customizeChart(options: EChartsCoreOption, colorMode: string) {
  // Set the color mode
  if (colorMode === 'dark') {
    options.backgroundColor = '#222';
    options.textStyle = { color: '#ffffff' };
    options.axisLine = { lineStyle: { color: '#eee' } };
    options.tooltip = { backgroundColor: '#333', textStyle: { color: '#eee' } };
    options.grid = {
      bottom: 130, // Increase this value to provide more space for x-axis labels
      left: 150, // Increase this value to provide more space for x-axis labels
      top: 150,
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
