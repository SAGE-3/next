import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

export interface barChartProps {
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

export default function createBarChart(extractedHeaders: string[], fileName: string, data: string[]) {
  let barChartSpec: barChartProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    mark: 'bar',
    encoding: {
      x: { field: '', type: '' },
      y: { field: '', type: '', aggregate: '' },
      xOffset: { field: '' },
    },
    transform: [] as any,
  };
  let specifications = [];
  extractedHeaders = organizeBarChartHeaders(extractedHeaders, data);

  if (extractedHeaders.length == 2) {
    barChartSpec.data.url = '/api/assets/static/' + fileName;
    barChartSpec.encoding.x.field = extractedHeaders[1];
    barChartSpec.encoding.x.type = 'nominal';

    barChartSpec.encoding.y.field = extractedHeaders[0];
    barChartSpec.encoding.y.type = 'quantitative';
    barChartSpec.encoding.y.aggregate = 'sum';
    specifications.push(barChartSpec);
  } else if (extractedHeaders.length == 3) {
    barChartSpec.data.url = '/api/assets/static/' + fileName;
    barChartSpec.encoding.x.field = extractedHeaders[1];
    barChartSpec.encoding.x.type = 'nominal';

    barChartSpec.encoding.y.field = extractedHeaders[0];
    barChartSpec.encoding.y.type = 'quantitative';
    barChartSpec.encoding.y.aggregate = 'sum';
    barChartSpec.encoding.xOffset = { field: extractedHeaders[2] };
    barChartSpec.encoding.color = { field: extractedHeaders[2] };
    specifications.push(barChartSpec);
  }

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
