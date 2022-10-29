/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppName, AppSchema, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';

/**
 * Setup data structure to open an application
 *
 * @export
 * @param {AppName} appName
 * @param {number} x
 * @param {number} y
 * @param {string} roomId
 * @param {string} boardId
 * @param {string} userId
 */
export function setupApp(
  title: string,
  type: AppName,
  x: number,
  y: number,
  roomId: string,
  boardId: string,
  { w, h }: { w: number; h: number } = { w: 400, h: 400 },
  init: Partial<AppState> = {}
): AppSchema {
  return {
    title: title,
    roomId: roomId,
    boardId: boardId,
    position: { x: x, y: y, z: 0 },
    size: { width: w, height: h, depth: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    type: type,
    state: { ...(initialValues[type] as AppState), ...init },
    raised: true,
  };
}
