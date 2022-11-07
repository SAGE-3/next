// Extracts explicitly mentioned chart types from user's query
export default function extractChartType(input: string, availabeCharts: { key: string; mark: string; available: boolean }[]) {
  let extractedChartType = '';
  for (let i = 0; i < availabeCharts.length; i++) {
    if (availabeCharts[i].available) {
      if (input.includes(availabeCharts[i].key)) {
        extractedChartType = availabeCharts[i].mark;
        break;
      }
    }
  }

  return extractedChartType;
}
