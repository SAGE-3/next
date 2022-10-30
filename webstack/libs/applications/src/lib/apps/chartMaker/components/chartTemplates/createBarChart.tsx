import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

let barSpecificationTemplate = {
  description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
  title: '',
  data: {
    url: '',
  },
  mark: 'bar',
  encoding: {
    x: { field: '', type: '' },
    y: { field: '', type: '', aggregate: '' },
  },
  transform: [] as any,
};

export default function createBarChart(extractedHeaders: string[], fileName: string, data: Record<string, string>[]) {
  let specifications = [];
  extractedHeaders = organizeBarChartHeaders(extractedHeaders, data);
  for (let i = 1; i < extractedHeaders.length; i++) {
    let barChartSpec = {
      ...barSpecificationTemplate,
    };
    barChartSpec.data.url = '/api/assets/static/' + fileName;
    barChartSpec.encoding.x.field = extractedHeaders[i];
    barChartSpec.encoding.x.type = 'nominal';

    barChartSpec.encoding.y.field = extractedHeaders[0];
    barChartSpec.encoding.y.type = 'quantitative';
    barChartSpec.encoding.y.aggregate = 'sum';
    specifications.push(barChartSpec);
  }
  console.log(specifications);
  return specifications;
}

function organizeBarChartHeaders(extractedHeaders: string[], data: Record<string, string>[]) {
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
    throw 'Underspecified';
  }
}
