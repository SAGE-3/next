/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: the colours used to draw, in light and dark mode.
 * Shapes store colour names; the screen follows the colour mode, exports always use the light theme.
 */

import { useColorModeValue } from '@chakra-ui/react';

import { ColorName, PALETTE } from '../model/shape';

export type Theme = {
  palette: Record<ColorName, { stroke: string; fill: string }>;
  canvas: string; // canvas background
  grid: string; // grid dots
  labelBackground: string; // behind labels on lines and arrows
  handleFill: string; // selection handles and anchors
  panel: string; // tool column and label editor background
};

export const LIGHT_THEME: Theme = {
  palette: PALETTE,
  canvas: '#ffffff',
  grid: '#b4bfcc',
  labelBackground: '#ffffff',
  handleFill: '#ffffff',
  panel: 'rgba(255, 255, 255, 0.92)',
};

// Same colour names: light lines and darker fills, readable on the dark canvas
export const DARK_THEME: Theme = {
  palette: {
    black: { stroke: '#e2e8f0', fill: '#4a5568' },
    grey: { stroke: '#a0aec0', fill: '#2d3748' },
    red: { stroke: '#fc8181', fill: '#742a2a' },
    orange: { stroke: '#f6ad55', fill: '#7b341e' },
    yellow: { stroke: '#f6e05e', fill: '#744210' },
    green: { stroke: '#68d391', fill: '#22543d' },
    blue: { stroke: '#63b3ed', fill: '#2a4365' },
    purple: { stroke: '#b794f4', fill: '#44337a' },
  },
  canvas: '#1a202c',
  grid: '#5e6a7c',
  labelBackground: '#1a202c',
  handleFill: '#1a202c',
  panel: 'rgba(26, 32, 44, 0.92)',
};

/** The theme for the current colour mode */
export const useDrawingTheme = (): Theme => useColorModeValue(LIGHT_THEME, DARK_THEME);
