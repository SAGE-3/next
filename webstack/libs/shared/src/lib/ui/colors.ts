/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


export const colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink'] as const;

export type SAGEColors = (typeof colors)[number];

/**
 * Returns a color from the SAGE color palette
 *
 * @export
 * @returns {SAGEColors}
 */
export function randomSAGEColor(): SAGEColors {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getHexColor(color: SAGEColors): string {
  switch (color) {
    case 'red':
      return '#e53e3e';
    case 'orange':
      return '#dd6b20';
    case 'yellow':
      return '#d69e2e';
    case 'green':
      return '#38a169';
    case 'teal':
      return '#319795';
    case 'blue':
      return '#3182ce';
    case 'cyan':
      return '#00b5d8';
    case 'purple':
      return '#bec6dc';
    case 'pink':
      return '#d53f8c';
    default:
      throw new Error(`Unknown color: ${color}`);
  }
}
