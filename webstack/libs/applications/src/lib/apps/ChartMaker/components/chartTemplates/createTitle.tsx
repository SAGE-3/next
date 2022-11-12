/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Generate titles of the charts
export default function createTitle(extractedHeaders: string | any[], intent: string, extractedFilteredValues: string[]) {
  let chartTitle = '';
  let headerLength = extractedHeaders.length;
  let headerTitles = [];

  // Limited to 3 because of switch statement below
  if (headerLength > 3) {
    headerLength = 3;
  }
  for (let i = 0; i < extractedHeaders.length; i++) {
    let headers = extractedHeaders[i].split(' ');
    let title = '';
    for (let n = 0; n < headers.length; n++) {
      title += headers[n].charAt(0) + headers[n].slice(1) + ' ';
    }
    headerTitles.push(title);
  }

  if (intent == 'map') {
    // Maps only have one nominal attribute but extractedHeaders.length is two
    // But the chart type 'map' is also the same as lat lon and map.
    // This should not be included in the title/
    chartTitle = 'map of ' + extractedHeaders[1];
  } else {
    // All other chart types have will add every extracted header
    switch (headerLength) {
      case 1:
        switch (intent) {
          // unlikely to use one attribute, but possible
          case 'histogram':
            chartTitle += 'histogram of ' + headerTitles[0];
            break;
          case 'bar':
            chartTitle += 'bar chart of ' + headerTitles[0];
            break;
          case 'line':
            chartTitle += 'line chart of ' + headerTitles[0];
            break;
          case 'scatter':
            chartTitle += 'scatter plot of ' + extractedHeaders[0];
            break;
        }
        break;
      case 2:
        // Two attributes, standard
        if (intent == 'bar') {
          chartTitle += 'bar chart of ' + headerTitles[1] + 'vs. ' + headerTitles[0];
        } else {
          chartTitle += intent.charAt(0) + intent.slice(1) + ' chart of ' + headerTitles[1] + ' vs. ' + headerTitles[0];
        }

        break;
      // if three headers, most likely will use "colored by.."
      case 3:
        chartTitle +=
          intent.charAt(0) + intent.slice(1) + ' chart of ' + headerTitles[1] + ' vs. ' + headerTitles[0] + 'colored by ' + headerTitles[2];
        break;
      default:
        return '';
    }
  }
  // add filters to the end
  if (extractedFilteredValues.length > 0) {
    chartTitle += ' filtered by ';
    for (let i = 0; i < extractedFilteredValues.length; i++) {
      if (i == extractedFilteredValues.length - 1) {
        chartTitle += extractedFilteredValues[i];
        break;
      }
      chartTitle += extractedFilteredValues[i] + ' and ';
    }
  }

  return chartTitle;
}
