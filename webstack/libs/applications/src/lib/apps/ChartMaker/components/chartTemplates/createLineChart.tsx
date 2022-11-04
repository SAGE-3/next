import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

export interface lineChartProps {
  description: string;
  title: string;
  data: { url: string };
  mark: string;
  encoding: {
    x: { field: string; type: string };
    y: { field: string; type: string; aggregate: string };
    color?: { field: string };
  };
  transform: any[];
}

export default function createLineChart(extractedHeaders: string[], fileName: string, data: string[]) {
  let lineChartSpec: lineChartProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    mark: 'line',
    encoding: {
      x: { field: '', type: '' },
      y: { field: '', type: '', aggregate: '' },
    },
    transform: [] as any,
  };
  let specifications = [];
  extractedHeaders = organizeLineChartHeaders(extractedHeaders, data);

  if (extractedHeaders.length == 2) {
    lineChartSpec.data.url = '/api/assets/static/' + fileName;
    lineChartSpec.encoding.x.field = extractedHeaders[1];
    lineChartSpec.encoding.x.type = 'temporal';

    lineChartSpec.encoding.y.field = extractedHeaders[0];
    lineChartSpec.encoding.y.type = 'quantitative';
    lineChartSpec.encoding.y.aggregate = 'sum';
    specifications.push(lineChartSpec);
  } else if (extractedHeaders.length == 3) {
    lineChartSpec.data.url = '/api/assets/static/' + fileName;
    lineChartSpec.encoding.x.field = extractedHeaders[1];
    lineChartSpec.encoding.x.type = 'nominal';

    lineChartSpec.encoding.y.field = extractedHeaders[0];
    lineChartSpec.encoding.y.type = 'quantitative';
    lineChartSpec.encoding.y.aggregate = 'sum';
    lineChartSpec.encoding.color = { field: extractedHeaders[2] };
    specifications.push(lineChartSpec);
  }

  return specifications;
}

function organizeLineChartHeaders(extractedHeaders: string[], data: string[]) {
  let quantitativeFound = false;
  let temporalFound = false;
  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'quantitative') {
      switchHeaders(extractedHeaders, 0, i);
      quantitativeFound = true;
    }
  }
  for (let i = 1; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'temporal') {
      switchHeaders(extractedHeaders, 1, i);
      temporalFound = true;
    }
  }
  if (quantitativeFound && temporalFound) {
    return extractedHeaders;
  } else {
    throw 'Underspecified';
  }
}
