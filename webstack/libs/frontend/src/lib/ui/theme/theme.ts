/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

//
// SAGE3 Chakra UI Theme
//

import { extendTheme, StyleFunctionProps, ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
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
      bg: mode('gray.50', '#212121')(props),
    },
  }),
};

// Custom component variants
const components = {
  // Drawer variant to allow pointer events to the underlying content
  Drawer: {
    variants: {
      clickThrough: {
        overlay: {
          pointerEvents: 'none',
          background: 'transparent',
        },
        dialogContainer: {
          pointerEvents: 'none',
          background: 'transparent',
        },
        dialog: {
          pointerEvents: 'auto',
        },
      },
    },
  },
};

// Extend the theme
export const theme = extendTheme({ config, components, colors, styles });
