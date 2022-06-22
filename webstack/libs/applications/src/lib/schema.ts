/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// import and re-export all the apps
import { Position, Rotation, SBDoc, Size } from '@sage3/shared/types';
import { AppName, AppState } from './types';
export { AppName, AppState } from './types';

// build the main schema
export type AppData = {
  name: string;
  description: string;
  roomId: string;
  boardId: string;
  ownerId: string;
  position: Position;
  size: Size;
  rotation: Rotation;
  type: AppName;
  state: AppState;
};

export type User = SBDoc & { data: AppData };