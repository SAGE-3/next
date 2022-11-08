import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

interface encodingProps {
  data: string;
  mark: {
    type: string;
    stroke: string;
  };
  encoding: {
    color: {
      field: string;
      type: string;
    };
    shape: { field: string; type: string };
  };
}

interface layerProps {
  data: {
    url: string;
    format: {
      type: string;
      feature: string;
    };
    mark: {
      type: string;
      fill: string;
      stroke: string;
    };
  };
}

export interface mapChartProps {
  description: string;
  title: string;
  data: { url: string };
  projection: { type: string };
  layer: any[];
  transform?: any[];
}

export default function createMapChart(extractedHeaders: string[], fileName: string, data: string[]) {
  let barChartSpec: mapChartProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    projection: { type: 'albersUsa' },
    layer: [
      {
        data: {
          url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json',
          format: {
            type: 'topojson',
            feature: 'states',
          },
        },
        mark: {
          type: 'geoshape',
          fill: 'lightgray',
          stroke: 'white',
        },
      },
    ],
  };
  let specifications: never[] = [];
  extractedHeaders = organizeBarChartHeaders(extractedHeaders, data);

  let encoding = {
    data: '/api/assets/static/' + fileName,
    mark: { type: 'geoshape', stroke: 'black' },
    transform: [],
    encoding: {
      color: {
        field: extractedHeaders[1],
        type: 'nominal',
        legend: { labelFontSize: 15, titleFontSize: 15, labelLimit: 2000 },
      },
      shape: { field: 'geo', type: 'geojson' },
    },
  };

  barChartSpec.layer.push(encoding);

  return specifications;
}

// Will put headers in this order
// [quantitative, nominal, nominal, nominal....]
function organizeBarChartHeaders(extractedHeaders: string[], data: string[]) {
  let quantitativeFound = false;
  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'quantitative') {
      switchHeaders(extractedHeaders, 0, i);
      quantitativeFound = true;
    }
  }

  // Automatically look for Quantitative data type
  if (!quantitativeFound) {
    const headers = Object.keys(data);

    for (let i = 0; i < headers.length; i++) {
      if (findHeaderType(headers[i], data) === 'quantitative') {
        extractedHeaders.unshift(headers[i]);
        quantitativeFound = true;
        break;
      }
    }
  }

  if (quantitativeFound) {
    return extractedHeaders;
  } else {
    throw 'You did not provide enough details to generate a chart';
  }
}

// for (let i = 1; i < extractedHeaders.length; i++) {
//   let barChartSpec = {
//     ...barSpecificationTemplate,
//   };
//   barChartSpec.data.url = '/api/assets/static/' + fileName;
//   barChartSpec.encoding.x.field = extractedHeaders[i];
//   barChartSpec.encoding.x.type = 'nominal';

//   barChartSpec.encoding.y.field = extractedHeaders[0];
//   barChartSpec.encoding.y.type = 'quantitative';
//   barChartSpec.encoding.y.aggregate = 'sum';
//   specifications.push(barChartSpec);
// }
