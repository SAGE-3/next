// Numerical -> Discrete, Continuous
// Categorical -> Nominal, Ordinal

export const chartInfo = {
  "Variable Width Column Chart": {
    description: "Comparison -> Among items -> Two variables per item",
    visualizationElements: [
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "xAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Budgeting: expense type, amount spent, percentage of amount spent based on total budget",
  },
  "Scatter Matrix Chart": {
    description: "Comparison -> Among items -> Many categories",
    visualizationElements: [
      {
        type: "scatterMatrixAttributes",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Iris dataset with sepal length, sepal width, petal length, and petal width",
  },
  "Bar Chart": {
    description:
      "Comparison -> Among items -> One variable per item -> Few categories -> Many items",
    visualizationElements: [
      {
        type: "yAxis",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "xAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "GPU performance comparison: GPU model goes on the yAxis, performance goes on the xAxis",
  },
  "Column Chart": {
    description:
      "Comparison -> Among items -> One variable per item -> Single or few categories -> Few items",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Comparing product sales by year: products, sales, year",
  },
  "Radar Chart": {
    description: "Comparison -> Over time -> Many periods -> Cyclical data",
    visualizationElements: [
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "indicator",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "value",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Temperature of different states over a year: month, state, temperature",
  },
  "Line Chart": {
    description: "Comparison -> Over time -> Many periods -> Non-cyclical data",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Stock prices over time: time, stock, price",
  },
  "Column Histogram": {
    description: "Distribution -> Single variable -> Few data points",
    visualizationElements: [
      {
        type: "bin",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "count",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
    ],
    example: "Student grades: grade, number of students",
  },
  "Line Histogram": {
    description: "Distribution -> Single variable -> Many data points",
    visualizationElements: [
      {
        type: "bin",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "count",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Distribution of student grades: grade, number of students",
  },
  "Scatter Chart": {
    description: "Relationship -> Two variables",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "any",
          subTypes: ["discrete", "continuous", "nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Weight and height: weight, height",
  },
  "3D Area Chart": {
    description: "Distribution -> Three variables",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "zAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Time of day, altitude, and temperature",
  },
  "Treemap Chart": {
    description: "Composition -> Static -> Components of components",
    visualizationElements: [
      {
        type: "treeParent",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "treeChild",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "value",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Market share of different companies: company, product, market share",
  },
  "Waterfall Chart": {
    description:
      "Composition -> Static -> Accumulation or subtraction to total",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Revenue over time: month, revenue",
  },
  "Pie Chart": {
    description: "Composition -> Static -> Simple share of total",
    visualizationElements: [
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "value",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Market share of different companies: company, market share",
  },
  "Stacked Area Chart": {
    description:
      "Composition -> Changing over time -> Many periods -> Relative and absolute differences matter",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "any",
          subTypes: ["nominal", "ordinal", "discrete", "continuous"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "label",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Product sales from x,y,z companies over time: time, sales, company",
  },
  "Stacked 100% Area Chart": {
    description:
      "Composition -> Changing over time -> Many periods -> Only relative differences matter",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "any",
          subTypes: ["nominal", "ordinal", "discrete", "continuous"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",

          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "label",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Distribution of occupations in the US over time: time, occupation",
  },
  "Stacked Column Chart": {
    description:
      "Composition -> Changing over time -> Few periods -> Relative and absolute differences matter",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
    ],
    example:
      "Product sales from x,y,z companies over time: time, sales, company",
  },
  "Stacked 100% Column Chart": {
    description:
      "Composition -> Changing over time -> Few periods -> Only relative differences matter",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "label",
        dataType: {
          mainType: "categorical",
          subTypes: ["nominal", "ordinal"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example:
      "Expenses from x, y, z departments in each quarter: quarter, expenses per department",
  },
  "Bubble Chart": {
    description: "Relationship -> Three variables",
    visualizationElements: [
      {
        type: "xAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "yAxis",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
      {
        type: "bubbleDiameter",
        dataType: {
          mainType: "numerical",
          subTypes: ["discrete", "continuous"],
        },
      },
    ],
    example: "Population's income and rent: income, rent, population size",
  },
};
