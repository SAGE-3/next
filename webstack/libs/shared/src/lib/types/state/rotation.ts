/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * @typedef {object} Rotation
 * Represents the rotation of any object in euler angles.
 */
export type Rotation = {
  /**
 * @property {number} width Rotation on the x axis
 */
  x: number,
  /**
* @property {number} height Rotation on the y axis
*/
  y: number,
  /**
* @property {number} depth Rotation on the z axis
*/
  z: number,
}