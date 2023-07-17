/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGE3Collection } from '../../generics';
import { RoomMember, RoomSchema, UserSchema } from '@sage3/shared/types';

/**
 * This file containts code to update the RoomsCollection due to a Schema Change.
 *
 * The schema added the following fields:
 * members: [
 * {
 *   userId: string,
 *   role: 'owner' | 'moderator' |'collaborator' |'viewer'
 * }
 *]
 *
 * This change required us to update the RoomCollection docs to add the members field.
 * It will add the current owner as the only member of the room.
 *
 * @branch dev-accesscontrol
 * @date 2023 - 07 - 17
 */
export async function membersFieldAdded(roomCollection: SAGE3Collection<RoomSchema>, userCollection: SAGE3Collection<UserSchema>) {
  const rooms = await roomCollection.getAll();
  const users = await userCollection.getAll();

  // If there are no rooms, we don't need to do anything.
  if (!rooms) {
    console.log('Server> RoomCollectionControl.ts> membersFieldAdded> No rooms to update.');
  }

  const promises = rooms?.map(async (room) => {
    if (room.data.members) {
      console.log('Server> RoomCollectionControl.ts> membersFieldAdded> Room already has members field.');
      return;
    }
    const ownerId = room._createdBy;
    const owner = users?.find((user) => user._id === ownerId);
    if (!owner) {
      console.log('Server> RoomCollectionControl.ts> membersFieldAdded> No owner found for room.');
      return;
    }
    const members: RoomMember[] = [
      {
        userId: owner._id,
        role: 'owner',
      },
    ];
    return await roomCollection.update(room._id, 'NODE_SERVER', { ...room.data, members });
  });

  if (promises) {
    await Promise.all(promises);
  } else {
    console.log('Server> RoomCollectionControl.ts> membersFieldAdded> No promises to await.');
    return;
  }

  console.log('Server> RoomCollectionControl.ts> membersFieldAdded> Updated all rooms with members field.');
  return;
}
