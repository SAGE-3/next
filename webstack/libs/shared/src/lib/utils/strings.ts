/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Parses a file size string and converts it to a number representing the size in bytes.
 *
 * @param size - The file size string to parse. It should be a number followed by a unit (KB, MB, GB, or TB).
 *               For example: "22", "10 KB", "1.5 MB", "2 GB", "0.5TB".
 * @returns The file size in bytes as a number, or `null` if the input format is incorrect.
 *
 */
export function parseFileSize(size: string): number {
  const units: { [key: string]: number } = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  // Match a number with optional decimal part, optional whitespace, and optional unit
  const match = size.match(/^(\d+(?:\.\d+)?)(?:\s*(KB|MB|GB))?$/i);

  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase() || ''; // Default to '' if no unit
    return value * (units[unit] || 1); // Default to bytes if no unit
  }

  // Return 0 if the input format is incorrect
  return 0;
}

/**
 * Return a string for a file size number
 *
 * @param {number} size
 * @returns {string}
 */
export function humanFileSize(size: number): string {
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const val = Number((size / Math.pow(1024, i)).toFixed(1));
  return val + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}
