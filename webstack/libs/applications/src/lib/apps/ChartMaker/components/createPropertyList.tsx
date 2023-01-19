/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

export const specialTypes = [{ header: 'map', type: 'map' }];
// Special case to return header type
function checkType(header: string, data: any) {
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
  } else if (isNaN(data[0][header])) {
    return 'nominal';
  } else {
    return 'quantitative';
  }
}

// Used by ChartMaker.tsx (main app) to create initial property list
// This will generate unique filter values
export default function createPropertyList(
  data: any,
  headers: string[]
): {
  header: string;
  filterValues: any[];
  headerType: string;
}[] {
  let propertyList = [];
  for (let i = 0; i < headers.length; i++) {
    // Check for nominal headers
    if (checkType(headers[i], data) === 'nominal') {
      var flags: never[] | boolean[] = [],
        uniqueNominalValues = [],
        l = data.length,
        n;
      // Get unique values only
      for (n = 0; n < l; n++) {
        if (flags[data[n][headers[i]]]) continue;
        flags[data[n][headers[i]]] = true;
        uniqueNominalValues.push(data[n][headers[i]]);
        uniqueNominalValues = uniqueNominalValues.flat();
      }
      // Add proprty to list
      let propertyInfo = { header: headers[i], filterValues: uniqueNominalValues, headerType: 'nominal' };
      propertyList.push(propertyInfo);
    } else if (checkType(headers[i], data) === 'quantitative') {
      var quantitativeValues = [];
      quantitativeValues.push();
      let quantitativeData = [];
      // Get max and min value from dataset
      for (let j = 0; j < data.length; j++) {
        let num = parseFloat(data[j][headers[i]]);
        if (isNaN(num)) {
        } else {
          quantitativeData.push(num);
        }
      }
      quantitativeValues.push(Math.min(...quantitativeData));
      quantitativeValues.push(Math.max(...quantitativeData));

      quantitativeValues = quantitativeValues.flat();
      let propertyInfo = { header: headers[i], filterValues: quantitativeValues, headerType: 'quantitative' };

      propertyList.push(propertyInfo);
    } else {
      // Empty for temporal.
      // TODO need to add earliest and oldest dates in filter values
      let propertyInfo = { header: headers[i], filterValues: [], headerType: 'specialType' };
      propertyList.push(propertyInfo);
    }
  }
  return propertyList;
}
