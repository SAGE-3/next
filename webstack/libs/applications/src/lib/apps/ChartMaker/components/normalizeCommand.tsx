/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import findHeaderType from './findHeaderType';

export default function normalizeCommand(
  input: string,
  propertyList: { header: string; filterValues: string[]; headerType: string }[],
  data: string[]
): string {
  propertyList.forEach((prop) => {
    prop.filterValues.forEach((filter) => {
      input = input.replace(filter, 'nominal');
    });
    input = input.replace(prop.header, findHeaderType(prop.header, data));
  });
  return input;
}
