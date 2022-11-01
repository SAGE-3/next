export default function createTransform(
  extractedFilterValues: string[],
  propertyList: { header: string; filterValues: string[]; headerType: string }[]
): any[] {
  let filters = [];

  for (let i = 0; i < propertyList.length; i++) {
    for (let j = 0; j < propertyList[i].filterValues.length; j++) {
      for (let k = 0; k < extractedFilterValues.length; k++) {
        if (propertyList[i].filterValues[j] == extractedFilterValues[k]) {
          filters.push({ filter: { field: propertyList[i].header, oneOf: [propertyList[i].filterValues[j]] } });
        }
      }
    }
  }
  return filters;
}
