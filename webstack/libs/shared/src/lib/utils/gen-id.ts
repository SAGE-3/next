/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { v4 } from 'uuid';

/**
 * Generates a unique string Id.
 * Uses uuid.
 * @returns 
 */
export function genId(): string {
  return v4();
}