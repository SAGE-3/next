/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Extract explicitly mentioned filter values from the users query
export default function extractFilters(input: string, propertyList: { header: string; filterValues: string[]; headerType: string }[]) {
  const extractedFilterValues: string[] = [];

  // Only checks for nominal values for now
  // TODO: add for quantitaive and temporal values
  propertyList.forEach((property) => {
    property.filterValues.forEach((filterValue) => {
      if (input.includes(filterValue)) {
        extractedFilterValues.push(filterValue);
      }
    });
  });
  return extractedFilterValues;
}
