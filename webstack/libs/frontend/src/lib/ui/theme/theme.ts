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

import { extendTheme, StyleFunctionProps, ThemeConfig } from '@chakra-ui/react';

import { colors } from './colors';

// Add your color mode config
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const styles = {
  global: (props: StyleFunctionProps) => ({
    // styles for the `body`
    body: {
      bg: props.colorMode == 'light' ? 'gray.50' : 'gray.800',
    },
  }),
};

// Extend the theme
export const theme = extendTheme({ config, colors, styles });
