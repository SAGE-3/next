/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

export const colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink'] as const;

export type SAGEColors = typeof colors[number];

/**
 * Returns a color from the SAGE color palette
 *
 * @export
 * @returns {SAGEColors}
 */
export function randomSAGEColor(): SAGEColors {
  return colors[Math.floor(Math.random() * colors.length)];
}
