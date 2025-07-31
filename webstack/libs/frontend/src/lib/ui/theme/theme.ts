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
      bg: mode('gray.50', '#323232')(props),
    },
    '[id*="chakra-toast-manager-bottom"]': {
       bottom: '44px !important',
    },
  }),
};

const components = {
  Drawer: {
    variants: {
      code: {
        dialogContainer: {
          pointerEvents: 'none',
          background: 'transparent',
        },
        dialog: {
          pointerEvents: 'auto',
        },
      },
      alwaysOpen: {
        overlay: {
          pointerEvents: 'none',
          background: 'transparent',
        },
        dialog: {
          pointerEvents: 'auto',
        },
        dialogContainer: {
          pointerEvents: 'none',
        },
      },
    },
  },
  Radio: {
    variants: {
      primary: ({ colorScheme = 'primary' }) => ({
        color: `${colorScheme}.500`,
        control: {
          _checked: {
            color: 'secondary.500',
          },
        },
      }),
    },
    defaultProps: {
      variant: 'primary',
      colorScheme: 'primary',
    },
  },
  // Looking to change the color scheme?  Remember to change the Interactionbar.tsx's color scheme logic
  // Button: {
  //   variants: {
  //     solid: (props: any) => ({
  //       bg: props.colorScheme === 'gray' ? 'gray.100' : `${props.colorScheme}.500`,
  //       _dark: {
  //         bg: props.colorScheme === 'gray' ? 'gray.600' : `${props.colorScheme}.200`,
  //       },
  //     }),
  //   },
  // },
};

// Extend the theme
export const theme = extendTheme({ config, colors, styles, components });
