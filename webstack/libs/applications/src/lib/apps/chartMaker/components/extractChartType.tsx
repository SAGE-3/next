export default function extractChartType(input: string, availabeCharts: { key: string; mark: string; available: boolean }[]) {
  let extractedChartType = '';
  availabeCharts.forEach((chart: { key: string; mark: string; available: boolean }) => {
    if (chart.available) {
      if (input.includes(chart.key)) {
        extractedChartType = chart.mark;
      }
    }
  });
  console.log(extractedChartType);
  return extractedChartType;
}
