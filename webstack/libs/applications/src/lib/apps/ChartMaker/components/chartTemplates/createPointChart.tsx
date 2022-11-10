import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

export interface pointChartProps {
  description: string;
  title: string;
  data: { url: string };
  mark: string;
  encoding: {
    x: { field: string; type: string };
    y: { field: string; type: string; aggregate: string };
    xOffset?: { field: string };
    color?: { field: string };
  };
  transform: any[];
}

export default function createPointChart(extractedHeaders: string[], fileName: string, data: string[]) {
  let pointChartSpec: pointChartProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    mark: 'tick',
    encoding: {
      x: { field: '', type: '' },
      y: { field: '', type: '', aggregate: '' },
      xOffset: { field: '' },
    },
    transform: [] as any,
  };
  let specifications = [];
  extractedHeaders = organizePointChartHeaders(extractedHeaders, data);

  if (extractedHeaders.length == 2) {
    pointChartSpec.data.url = '/api/assets/static/' + fileName;
    pointChartSpec.encoding.x.field = extractedHeaders[1];
    pointChartSpec.encoding.x.type = findHeaderType(extractedHeaders[1], data);

    pointChartSpec.encoding.y.field = extractedHeaders[0];
    pointChartSpec.encoding.y.type = findHeaderType(extractedHeaders[0], data);
    specifications.push(pointChartSpec);
  } else if (extractedHeaders.length == 3) {
    pointChartSpec.data.url = '/api/assets/static/' + fileName;
    pointChartSpec.encoding.x.field = extractedHeaders[1];
    pointChartSpec.encoding.x.type = findHeaderType(extractedHeaders[1], data);

    pointChartSpec.encoding.y.field = extractedHeaders[0];
    pointChartSpec.encoding.y.type = findHeaderType(extractedHeaders[0], data);
    pointChartSpec.encoding.xOffset = { field: extractedHeaders[2] };
    pointChartSpec.encoding.color = { field: extractedHeaders[2] };
    specifications.push(pointChartSpec);
  }

  return specifications;
}

// Will put headers in this order
// [quantitative, nominal, nominal, nominal....]
function organizePointChartHeaders(extractedHeaders: string[], data: string[]) {
  let quantitativeOneFound = false;

  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'quantitative') {
      switchHeaders(extractedHeaders, 0, i);
      quantitativeOneFound = true;
    }
  }

  // Automatically look for Quantitative data type
  if (!quantitativeOneFound) {
    const headers = Object.keys(data);

    for (let i = 0; i < headers.length; i++) {
      if (findHeaderType(headers[i], data) === 'quantitative') {
        extractedHeaders.unshift(headers[i]);
        quantitativeOneFound = true;
        break;
      }
    }
  }

  if (quantitativeOneFound) {
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
