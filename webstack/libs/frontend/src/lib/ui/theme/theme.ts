/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

//
// SAGE3 Chakra UI Theme
//

import { extendTheme, ThemeConfig } from '@chakra-ui/react'

// Add your color mode config
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// Extend the theme
export const theme = extendTheme({ config });
