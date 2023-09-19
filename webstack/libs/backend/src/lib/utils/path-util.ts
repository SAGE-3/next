/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Node Built-in Modules
 */
import * as fs from 'fs';

/**
 * Return the URL for a given asset
 *
 * @export
 * @param {string} filename
 * @returns {string}
 */
export function getStaticAssetUrl(filename: string): string {
  return `api/assets/static/${filename}`;
}

/**
 * Test if a given file exists
 *
 * @export
 * @param {string} filename
 * @returns {boolean}
 */
export function fileExist(filename: string): boolean {
  try {
    fs.accessSync(filename, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}
