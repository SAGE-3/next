/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useToken } from '@chakra-ui/react';

/**
 * Return a HEX code of the chakra color.
 * Ex. gray.400, red.200....etc
 * @param color The color to get the HEX code of (ex. gray.400)
 * @returns
 */
export function useHexColor(color: string): string {
  // If string is a hex code, return it

  const col = color.includes('.') ? color : color + '.400';
  const c = useToken('colors', col);
  if (color.startsWith('#')) return color;
  return c;
}
