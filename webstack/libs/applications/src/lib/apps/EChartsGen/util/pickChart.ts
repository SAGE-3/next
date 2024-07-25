import { EChartsCoreOption } from 'echarts';
import { charts, OptionParams } from './charts';

export const dataCategory = {
  numerical: ['discrete', 'continuous'],
  categorical: ['nominal', 'ordinal'],
};

export const NOMINAL = 'nominal';
export const ORDINAL = 'ordinal';
export const DISCRETE = 'discrete';
export const CONTINUOUS = 'continuous';

type PickChartParams = {
  data: any;
  chartType: string;
  attributes: {
    name: string;
    dataType: string;
  }[];
};

export function pickChart({ data, chartType, attributes }: PickChartParams): EChartsCoreOption {
  const option: OptionParams = {
    data,
    chartType,
    visualizationElements: {
      xAxis: undefined,
      yAxis: undefined,
      label: undefined, // Labeling data groups
      value: undefined,
      indicator: undefined,
      bin: undefined, // For histogram
      count: undefined, // For histogram
      bubbleDiameter: undefined,
      treemapParent: undefined, // For treemap
      treemapChild: undefined, // For treemap
      scatterMatrixAttributes: [], // For scatter matrix
    },
  };

  console.log('attributes', attributes);
  attributes.forEach((attribute) => {
    console.log(`${attribute.name}>`, attribute.dataType.toLowerCase(), dataCategory.numerical.includes(attribute.dataType.toLowerCase()));
  });

  // const isValidChart = (chartType) => charts[chartType as keyof typeof charts].attributes.length === attributes.length;

  switch (chartType) {
    case 'Variable Width Column Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.yAxis = attribute.name;
          }
        } else {
          option.visualizationElements.label = attribute.name;
        }
      });
      break;

    // case: "Table or Table with Embedded Charts":

    case 'Bar Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.xAxis = attribute.name;
        } else {
          option.visualizationElements.yAxis = attribute.name;
        }
      });
      break;

    case 'Column Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Radar Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.value = attribute.name;
        } else {
          if (attribute.dataType.toLowerCase() === ORDINAL && option.visualizationElements.indicator === undefined) {
            option.visualizationElements.indicator = attribute.name;
          } else if (attribute.dataType.toLowerCase() === NOMINAL && option.visualizationElements.label === undefined) {
            option.visualizationElements.label = attribute.name;
          } else if (option.visualizationElements.indicator === undefined) {
            option.visualizationElements.indicator = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Line Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          if (attribute.dataType.toLowerCase() === ORDINAL && option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else if (attribute.dataType.toLowerCase() === NOMINAL && option.visualizationElements.label === undefined) {
            option.visualizationElements.label = attribute.name;
          } else if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Column Histogram':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase()) && option.visualizationElements.count === undefined) {
          option.visualizationElements.count = attribute.name;
        } else if (dataCategory.categorical.includes(attribute.dataType.toLowerCase()) && option.visualizationElements.bin === undefined) {
          option.visualizationElements.bin = attribute.name;
        } else if (option.visualizationElements.count === undefined) {
          option.visualizationElements.count = attribute.name;
        } else {
          option.visualizationElements.bin = attribute.name;
        }
      });
      break;

    case 'Line Histogram':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.count = attribute.name;
        } else {
          option.visualizationElements.bin = attribute.name;
        }
      });
      break;

    case 'Waterfall Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          option.visualizationElements.xAxis = attribute.name;
        }
      });
      break;

    case 'Pie Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.value = attribute.name;
        } else {
          option.visualizationElements.label = attribute.name;
        }
      });
      break;

    case 'Stacked Area Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          if (attribute.dataType.toLowerCase() === ORDINAL && option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else if (attribute.dataType.toLowerCase() === NOMINAL && option.visualizationElements.label === undefined) {
            option.visualizationElements.label = attribute.name;
          } else if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Stacked 100% Area Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          if (attribute.dataType.toLowerCase() === ORDINAL && option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else if (attribute.dataType.toLowerCase() === NOMINAL && option.visualizationElements.label === undefined) {
            option.visualizationElements.label = attribute.name;
          } else if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Stacked Column Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          if (attribute.dataType.toLowerCase() === ORDINAL && option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else if (attribute.dataType.toLowerCase() === NOMINAL && option.visualizationElements.label === undefined) {
            option.visualizationElements.label = attribute.name;
          } else if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Stacked 100% Column Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.yAxis = attribute.name;
        } else {
          if (attribute.dataType.toLowerCase() === ORDINAL && option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else if (attribute.dataType.toLowerCase() === NOMINAL && option.visualizationElements.label === undefined) {
            option.visualizationElements.label = attribute.name;
          } else if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.label = attribute.name;
          }
        }
      });
      break;

    case 'Bubble Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else if (option.visualizationElements.yAxis === undefined) {
            option.visualizationElements.yAxis = attribute.name;
          } else {
            option.visualizationElements.bubbleDiameter = attribute.name;
          }
        }
      });
      break;

    case 'Scatter Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          if (option.visualizationElements.xAxis === undefined) {
            option.visualizationElements.xAxis = attribute.name;
          } else {
            option.visualizationElements.yAxis = attribute.name;
          }
        } else {
          option.visualizationElements.label = attribute.name;
        }
      });
      break;

    case 'Treemap Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.value = attribute.name;
        } else {
          if (option.visualizationElements.treemapParent === undefined) {
            option.visualizationElements.treemapParent = attribute.name;
          } else {
            option.visualizationElements.treemapChild = attribute.name;
          }
        }
      });
      break;

    case 'Scatter Matrix Chart':
      attributes.forEach((attribute) => {
        if (dataCategory.numerical.includes(attribute.dataType.toLowerCase())) {
          option.visualizationElements.scatterMatrixAttributes.push(attribute.name);
        } else {
          throw new Error('Scatter Matrix Chart requires all numerical attributes');
        }
      });
      break;
  }
  console.log(charts[chartType as keyof typeof charts].generateOption(option as Partial<OptionParams>));
  return charts[chartType as keyof typeof charts].generateOption(option as Partial<OptionParams>) as EChartsCoreOption;
}
