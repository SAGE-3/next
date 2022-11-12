/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Adding filters to charts
export default function createTransform(
  extractedFilterValues: string[],
  propertyList: { header: string; filterValues: string[]; headerType: string }[]
): any[] {
  let filters = [];

  // Generate filters
  for (let i = 0; i < propertyList.length; i++) {
    // Filters with same "attribute" need to be in same array
    let tmpFilters = [];

    for (let j = 0; j < extractedFilterValues.length; j++) {
      for (let k = 0; k < propertyList[i].filterValues.length; k++) {
        if (propertyList[i].filterValues[k] == extractedFilterValues[j]) {
          tmpFilters.push(propertyList[i].filterValues[k]);
        }
      }
    }
    if (tmpFilters.length > 0) {
      // 'oneOf' will only include the fitler that is mentioned
      // One ambigutation is whether to include or disclude filters.
      filters.push({ filter: { field: propertyList[i].header, oneOf: tmpFilters } });
    }
  }
  return filters;
}
