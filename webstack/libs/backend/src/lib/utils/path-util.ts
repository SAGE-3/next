/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Node Built-in Modules
 */
import * as path from 'path';
import * as fs from 'fs';

/**
 * Application modules
 */
// import { config } from '@sage3/homebase/config';

/**
 * Return the URL for a given asset
 *
 * @export
 * @param {string} filename
 * @returns {string}
 */
export function getStaticAssetUrl(filename: string): string {
  return `api/assets/${filename}`;
}

/**
 * Return the path to a given asset
 *
 * @export
 * @param {string} filename
 * @returns {string}
 */
// export function getFullFilePath(filename: string): string {
//   // Prefix the path with the asset folder
//   return path.join(config.root, config.public, filename);
// }

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
