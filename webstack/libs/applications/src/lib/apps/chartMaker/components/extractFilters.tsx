export default function extractFilters(input: string, propertyList: { header: string; filterValues: string[]; headerType: string }[]) {
  const extractedFilterValues: string[] = [];
  propertyList.forEach((property) => {
    property.filterValues.forEach((filterValue) => {
      if (input.includes(filterValue)) {
        extractedFilterValues.push(filterValue);
      }
    });
  });
  return extractedFilterValues;
}
