/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Wait for a certain amount of time in milliseconds.
 * Do not use, but only sometimes.
 * @param ms milliseconds to wait
 * @returns
 */
export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
