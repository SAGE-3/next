/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Special Data types
export const specialTypes = [{ header: 'map', type: 'map' }];

// Check dataset headers and return data type
export default function findHeaderType(header: string, data: any) {
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
  } else if (isNaN(data[header])) {
    return 'nominal';
  } else {
    return 'quantitative';
  }
}
