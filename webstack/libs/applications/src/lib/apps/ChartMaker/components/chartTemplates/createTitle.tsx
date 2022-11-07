export default function createTitle(extractedHeaders: string | any[], intent: string, extractedFilteredValues: string[]) {
  let chartTitle = '';
  let headerLength = extractedHeaders.length;
  let headerTitles = [];

  if (headerLength > 3) {
    headerLength = 3;
  }
  for (let i = 0; i < extractedHeaders.length; i++) {
    let headers = extractedHeaders[i].split(' ');
    let title = '';
    for (let n = 0; n < headers.length; n++) {
      title += headers[n].charAt(0).toUpperCase() + headers[n].slice(1) + ' ';
    }
    headerTitles.push(title);
  }

  if (intent == 'map') {
    chartTitle = 'Map of ' + extractedHeaders[1];
  } else {
    switch (headerLength) {
      case 1:
        switch (intent) {
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
        if (intent == 'bar') {
          chartTitle += 'bar chart of ' + headerTitles[1] + 'vs. ' + headerTitles[0];
        } else {
          chartTitle += intent.charAt(0).toUpperCase() + intent.slice(1) + ' Chart of ' + headerTitles[1] + ' vs. ' + headerTitles[0];
        }

        break;

      case 3:
        chartTitle +=
          intent.charAt(0).toUpperCase() +
          intent.slice(1) +
          ' chart of ' +
          headerTitles[1] +
          ' vs. ' +
          headerTitles[0] +
          'colored by ' +
          headerTitles[2];
        break;
      default:
        return '';
    }
  }
  if (extractedFilteredValues.length > 0) {
    chartTitle += 'filtered by ';
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
