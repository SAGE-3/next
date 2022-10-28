let barSpecificationTemplate = {
  description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
  data: {
    url: '',
  },
  mark: 'bar',
  encoding: {
    x: { field: '', type: '' },
    y: { field: '', type: '', aggregate: '' },
  },
};

export default function createBarChart(headers: string[], data: any, fileName: string) {
  console.log(headers, data);
  barSpecificationTemplate.data.url = '/api/assets/static/' + fileName;
  barSpecificationTemplate.encoding.x.field = headers[0];
  barSpecificationTemplate.encoding.x.type = 'nominal';
  barSpecificationTemplate.encoding.y.field = 'cases';
  barSpecificationTemplate.encoding.y.type = 'quantitative';
  barSpecificationTemplate.encoding.y.aggregate = 'sum';

  return barSpecificationTemplate;
}
