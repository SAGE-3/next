/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * The asset database model.
 *
 * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
 * @version 1.0.0
 */

// SAGE3 modules
import { AssetSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

class SAGE3AssetsCollection extends SAGE3Collection<AssetSchema> {
  constructor() {
    super('ASSETS', { file: '', room: '', owner: '' });
    const router = sageRouter<AssetSchema>(this);
    this.httpRouter = router;
  }

  // Delete all the assets of a specific user
  public async deleteUsersAssets(userId: string): Promise<number> {
    // Delete the assets of the user
    const userAssets = await this.query('owner', userId);
    const assetsIds = userAssets ? userAssets.map((asset) => asset._id) : [];
    const assetsDeleted = await this.deleteBatch(assetsIds);
    return assetsDeleted ? assetsDeleted.length : 0;
  }

  // Delete all the assets in a specific room
  public async deleteAssetsInRoom(roomId: string): Promise<number> {
    // Delete the assets on the room
    const roomAssets = await this.query('room', roomId);
    const assetIds = roomAssets ? roomAssets.map((asset) => asset._id) : [];
    const assetsDeleted = await this.deleteBatch(assetIds);
    return assetsDeleted ? assetsDeleted.length : 0;
  }

  // Transfer all the assets of a user to another user
  public async transferUsersAssets(oldUserId: string, newOwner: string): Promise<boolean> {
    // Get all the assets of the user
    const userAssets = await this.query('owner', oldUserId);
    const assetsIds = userAssets ? userAssets.map((asset) => asset._id) : [];
    // Update the owner field of the assets
    const assetsUpdated = await Promise.all(assetsIds.map((assetId) => this.update(assetId, newOwner, { owner: newOwner })));
    return assetsUpdated ? true : false;
  }
}

export const AssetsCollection = new SAGE3AssetsCollection();
