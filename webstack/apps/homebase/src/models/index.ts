/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { BoardModel, RoomModel, UserModel, AppModel, AssetModel } from '../models';

export * from './app-model';
export * from './board-model';
export * from './room-model';
export * from './user-model';
export * from './asset-model';

/**
 * Load the various models at startup.
 */
export async function loadModels(): Promise<void> {
  await AppModel.initialize();
  await BoardModel.initialize();
  await RoomModel.initialize();
  await UserModel.initialize();
  await AssetModel.initialize();
}
