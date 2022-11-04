export default function createTransform(
  extractedFilterValues: string[],
  propertyList: { header: string; filterValues: string[]; headerType: string }[]
): any[] {
  let filters = [];

  for (let i = 0; i < propertyList.length; i++) {
    let tmpFilters = [];

    for (let j = 0; j < extractedFilterValues.length; j++) {
      for (let k = 0; k < propertyList[i].filterValues.length; k++) {
        console.log('comparing ', propertyList[i].filterValues[k], extractedFilterValues[j]);
        if (propertyList[i].filterValues[k] == extractedFilterValues[j]) {
          tmpFilters.push(propertyList[i].filterValues[k]);
          console.log(tmpFilters);
          // filters.push({ filter: { field: propertyList[i].header, oneOf: [propertyList[i].filterValues[j]] } });
        }
      }
    }
    if (tmpFilters.length > 0) {
      filters.push({ filter: { field: propertyList[i].header, oneOf: tmpFilters } });
    }
  }
  return filters;
}
