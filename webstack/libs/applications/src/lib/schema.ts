/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// import and re-export all the apps
import { AppName, AppState } from './types';
export { AppName, AppState } from './types';

// build the main schema
export type AppSchema = {
  id: string;
  name: string;
  description: string;
  roomId: string;
  boardId: string;
  ownerId: string;
  type: AppName;
  state: AppState;
};
