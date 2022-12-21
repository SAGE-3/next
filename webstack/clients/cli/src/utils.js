/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Bound random number
 *
 * @param {any} min
 * @param {any} max
 * @returns random value
 */
export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamp a value between min and max
 *
 * @export
 * @param {any} val
 * @param {any} min
 * @param {any} max
 * @returns val
 */
export function clamp(val, min, max) {
  return val > max ? max : val < min ? min : val;
}
