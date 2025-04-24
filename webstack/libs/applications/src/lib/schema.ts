/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// import and re-export all the apps
import { Position, Rotation, SBDoc, Size } from '@sage3/shared/types';
import { AppName, AppState } from './types';
export { AppName, AppState } from './types';

// build the main schema
export type AppSchema = {
  title: string;
  roomId: string;
  boardId: string;
  position: Position;
  size: Size;
  rotation: Rotation;
  type: AppName;
  state: AppState;
  raised: boolean;
  dragging: boolean;
  pinned: boolean;
  sourceApps?: SBDoc['_id'][];
};

export type App = SBDoc & { data: AppSchema };
export type AppGroup = Array<App>;
