/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// import and re-export all the apps
import { Position, Rotation, SBDoc, Size } from '@sage3/shared/types';
import { AppName, AppState, AppStateMap } from './types';
export { AppName, AppState, AppStateMap } from './types';

// build the main schema
type AppCommon = {
  title: string;
  roomId: string;
  boardId: string;
  position: Position;
  size: Size;
  rotation: Rotation;
  raised: boolean;
  dragging: boolean;
  pinned: boolean;
  sourceApps?: SBDoc['_id'][];
};

export type AppSchema<N extends AppName = AppName> = {
  [K in N]: AppCommon & {
    type: K;
    state: AppStateMap[K];
  };
}[N];

// Creation may omit state defaults; persisted apps always carry the full, correlated state.
export type AppCreateInput = AppCommon & {
  type: AppName;
  state: Partial<AppState>;
};

export type App<N extends AppName = AppName> = SBDoc & {
  data: AppSchema<N>;
};

export type AppGroup<N extends AppName = AppName> = Array<App<N>>;
