import findHeaderType from './findHeaderType';

export default function inferChartType(visualizationTask: string, extractedHeaders: string[], data: string[]): string {
  switch (visualizationTask) {
    case 'extremum':
      return 'bar';
    case 'distribution':
      return 'bar';
    case 'cluster':
      return 'bar';
    case 'anomoly':
      return 'point';
    case 'correlation':
      if (findHeaderType(extractedHeaders[0], data) == 'nominal') {
        return 'heatmap';
      } else {
        return 'point';
      }
    case 'value':
      // return 'table';
      return 'bar';

    case 'trend':
      return 'line';
    default:
      return 'bar';
  }
  return '';
}
