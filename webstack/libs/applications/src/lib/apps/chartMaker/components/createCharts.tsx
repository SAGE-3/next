import createBarChart from './chartTemplates/createBarChart';

let specialTypes = [{ header: 'map', type: 'map' }];

export const createCharts = (input: string, data: Record<string, string>[], headers: string[], fileName: string) => {
  input = input.toLowerCase();
  const propertyList = createPropertyList(data, headers);
  const extractedHeaders = extractHeaders(input, headers);
  const extractedFilterValues = extractFilters(input, propertyList);
  let specification = createBarChart(extractedHeaders, data, fileName);
  return specification;
};

const extractHeaders = (input: string, headers: string[]) => {
  const extractedHeaders: string[] = [];
  headers.forEach((header) => {
    if (input.includes(header)) {
      extractedHeaders.push(header);
    }
  });
  return extractedHeaders;
};

const extractFilters = (input: string, propertyList: { header: string; filterValues: string[]; headerType: string }[]) => {
  const extractedFilterValues: string[] = [];
  propertyList.forEach((property) => {
    property.filterValues.forEach((filterValue) => {
      if (input.includes(filterValue)) {
        extractedFilterValues.push(filterValue);
      }
    });
  });
  return extractedFilterValues;
};

const createPropertyList = (data: any, headers: string[]) => {
  let propertyList = [];
  for (let i = 0; i < headers.length; i++) {
    if (findHeaderType(headers[i], data) === 'nominal') {
      var flags: never[] | boolean[] = [],
        uniqueNominalValues = [headers[i]],
        l = data.length,
        n;
      for (n = 0; n < l; n++) {
        if (flags[data[n][headers[i]]]) continue;
        flags[data[n][headers[i]]] = true;
        uniqueNominalValues.push(data[n][headers[i]]);
        uniqueNominalValues = uniqueNominalValues.flat();
      }
      let propertyInfo = { header: headers[i], filterValues: uniqueNominalValues, headerType: 'nominal' };
      propertyList.push(propertyInfo);
    } else if (findHeaderType(headers[i], data) === 'quantitative') {
      var quantitativeValues = [];
      quantitativeValues.push(headers[i]);
      let quantitativeData = [];
      for (let j = 0; j < data.length; j++) {
        let num = parseFloat(data[j][headers[i]]);
        if (isNaN(num)) {
          console.log(num);
        } else {
          quantitativeData.push(num);
        }
      }

      quantitativeValues.push(Math.min(...quantitativeData).toString() + ' - ' + Math.max(...quantitativeData).toString());
      quantitativeValues = quantitativeValues.flat();
      let propertyInfo = { header: headers[i], filterValues: quantitativeValues, headerType: 'quantitative' };

      propertyList.push(propertyInfo);
    } else {
      let propertyInfo = { header: headers[i], filterValues: [], headerType: 'specialType' };
      propertyList.push(propertyInfo);
    }
  }
  return propertyList;
};

const findHeaderType = (header: string, data: any) => {
  let lowerCaseHeader = header.toLowerCase();
  for (let i = 0; i < specialTypes.length; i++) {
    if (header === specialTypes[i].header) {
      return specialTypes[i].type;
    }
  }
  if (
    lowerCaseHeader.includes('date') ||
    lowerCaseHeader.includes('year') ||
    lowerCaseHeader.includes('month') ||
    lowerCaseHeader.includes('day') ||
    lowerCaseHeader.includes('months') ||
    lowerCaseHeader.includes('dates')
  ) {
    return 'temporal';
  } else if (isNaN(data[1][header])) {
    return 'nominal';
  } else {
    return 'quantitative';
  }
};
