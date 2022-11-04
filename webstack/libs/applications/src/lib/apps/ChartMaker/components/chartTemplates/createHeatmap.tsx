import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

export interface heatmapProps {
  description: string;
  title: string;
  data: { url: string };
  mark: string;
  encoding: {
    x: { field: string; type: string };
    y: { field: string; type: string };
    color?: { aggregate: string; type: string };
  };
  transform: any[];
}

export default function createHeatmap(extractedHeaders: string[], fileName: string, data: string[]) {
  let lineChartSpec: heatmapProps = {
    description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
    title: '',
    data: {
      url: '',
    },
    mark: 'rect',
    encoding: {
      x: { field: '', type: '' },
      y: { field: '', type: '' },
      color: { aggregate: '', type: '' },
    },
    transform: [] as any,
  };
  let specifications = [];
  extractedHeaders = organizeHeatmapHeaders(extractedHeaders, data);

  lineChartSpec.data.url = '/api/assets/static/' + fileName;
  lineChartSpec.encoding.x.field = extractedHeaders[1];
  lineChartSpec.encoding.x.type = 'nominal';

  lineChartSpec.encoding.y.field = extractedHeaders[0];
  lineChartSpec.encoding.y.type = 'nominal';

  lineChartSpec.encoding.color = { aggregate: 'count', type: 'quantitative' };
  specifications.push(lineChartSpec);

  return specifications;
}

function organizeHeatmapHeaders(extractedHeaders: string[], data: string[]) {
  // let quantitativeFound = false;
  // let temporalFound = false;
  // for (let i = 0; i < extractedHeaders.length; i++) {
  //   if (findHeaderType(extractedHeaders[i], data) === 'quantitative') {
  //     switchHeaders(extractedHeaders, 0, i);
  //     quantitativeFound = true;
  //   }
  // }
  // for (let i = 1; i < extractedHeaders.length; i++) {
  //   if (findHeaderType(extractedHeaders[i], data) === 'temporal') {
  //     switchHeaders(extractedHeaders, 1, i);
  //     temporalFound = true;
  //   }
  // }
  // if (quantitativeFound && temporalFound) {
  let nominalCount = 0;
  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) !== 'nominal') {
      extractedHeaders.splice(i, 1);
    } else {
      nominalCount++;
    }
  }
  if (nominalCount < 2) {
    throw 'Underspecified';
  } else {
    return extractedHeaders;
  }
  // } else {
  //   throw 'Underspecified';
  // }
}
