/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

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
