/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RoomSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';
import { BoardDeleteInfo, BoardsCollection } from './boards';
import { PluginsCollection } from './plugins';
import { RoomMembersCollection } from './roommembers';
import { AssetsCollection } from './assets';

export type RoomDeleteInfo = {
  roomId: string;
  roomDeleted: boolean;
  boardsDeleteInfo: BoardDeleteInfo[];
  assetsDeleted: number;
  pluginsDeleted: number;
  roomMembersDeleted: number;
};

class SAGE3RoomsCollection extends SAGE3Collection<RoomSchema> {
  constructor() {
    super('ROOMS', {
      name: '',
      ownerId: '',
    });

    const router = sageRouter<RoomSchema>(this);
    this.httpRouter = router;
  }

  // Delete all the rooms of a specific user
  public async deleteUsersRooms(userId: string): Promise<RoomDeleteInfo[]> {
    // Delete the rooms of the user
    const userRooms = await this.query('ownerId', userId);
    const roomsIds = userRooms ? userRooms.map((room) => room._id) : [];
    // Promise all delete using deleteRoom
    const roomsDeleted = await Promise.all(roomsIds.map((roomId) => this.deleteRoom(roomId)));
    return roomsDeleted;
  }

  public async deleteRoom(roomId: string): Promise<RoomDeleteInfo> {
    const results = {
      roomId,
      roomDeleted: false,
      boardsDeleteInfo: [],
      assetsDeleted: 0,
      pluginsDeleted: 0,
      roomMembersDeleted: 0,
    } as RoomDeleteInfo;

    // Delete the room
    const roomDeleted = await this.delete(roomId);
    results.roomDeleted = roomDeleted ? true : false;
    // Delete the boards of the room
    const boardsDelInfo = await BoardsCollection.deleteBoardsInRoom(roomId);
    results.boardsDeleteInfo = boardsDelInfo;
    // Delete the assets of the room
    const assetsDeleted = await AssetsCollection.deleteAssetsInRoom(roomId);
    results.assetsDeleted = assetsDeleted ? assetsDeleted : 0;
    // Delete the plugins of the room
    const pluginsDeleted = await PluginsCollection.deletePluginsInRoom(roomId);
    results.pluginsDeleted = pluginsDeleted;
    // Delete the members of the room
    const membersDeleted = await RoomMembersCollection.deleteMembersInRoom(roomId);
    results.roomMembersDeleted = membersDeleted ? membersDeleted : 0;
    return results;
  }
}

export const RoomsCollection = new SAGE3RoomsCollection();
