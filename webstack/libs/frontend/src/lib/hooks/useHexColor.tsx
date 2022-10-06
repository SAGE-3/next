/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useToken } from '@chakra-ui/react';
import { colors } from '../ui/theme/colors';

/**
 * Return a HEX code of the chakra color.
 * Ex. gray.400, red.200....etc
 * @param color The color to get the HEX code of (ex. gray.400)
 * @returns
 */
export function useHexColor(color: string): string {
  const col = color.includes('.') ? color : color + '.400';
  const c = useToken('colors', col);
  return c;
}
