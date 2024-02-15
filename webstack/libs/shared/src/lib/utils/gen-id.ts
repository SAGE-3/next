/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { v4 } from 'uuid';
import { customAlphabet } from 'nanoid';

// Custom alphabet without vowels and numbers that look like letters
// Used by generateReadableID
const nanoidGenerator = customAlphabet('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');

/**
 * Generates a unique string Id.
 * Uses uuid v4.
 * @returns {string} a unique ID
 */
export function genId(): string {
  return v4();
}

/**
 * Generate a readable ID, 10 characters long, in 2 parts of 5 characters
 * @returns {string} a readable ID
 */
export function generateReadableID(): string {
  // 10 characters long ID
  // --> 6M IDs needed, in order to have a 1% probability of at least one collision.
  const id = nanoidGenerator(10);
  // Split in 2 parts of 5 characters
  const s1 = id.substring(0, 5);
  const s2 = id.substring(5, 10);
  // Assembly with a dash
  return `${s1}-${s2}`;
}
