/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// import and re-export all the apps
import { Position, Rotation, SBDoc, Size } from '@sage3/shared/types';
import type { AppName, AppStateMap } from './types';
export type { AppName, AppState, AppStateMap } from './types';

// build the main schema
export type AppSchema<T extends AppName = AppName> = {
  title: string;
  roomId: string;
  boardId: string;
  position: Position;
  size: Size;
  rotation: Rotation;
  type: T;
  state: AppStateMap[T];
  raised: boolean;
  dragging: boolean;
  pinned: boolean;
  sourceApps?: SBDoc['_id'][];
};

export type App<T extends AppName = AppName> = SBDoc & { data: AppSchema<T> };
export type AppGroup<T extends AppName = AppName> = Array<App<T>>;

export function isApp<T extends AppName>(app: App, type: T): app is App<T> {
  return app.data.type === type;
}
