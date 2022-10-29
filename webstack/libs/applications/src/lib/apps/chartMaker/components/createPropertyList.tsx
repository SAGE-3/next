import findHeaderType from './findHeaderType';

export default function createPropertyList(data: any, headers: string[]) {
  let propertyList = [];
  for (let i = 0; i < headers.length; i++) {
    if (findHeaderType(headers[i], data) === 'nominal') {
      var flags: never[] | boolean[] = [],
        uniqueNominalValues = [],
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
  console.log(propertyList);
  return propertyList;
}
