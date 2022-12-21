/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  AppsCollection,
  BoardsCollection,
  RoomsCollection,
  UsersCollection,
  AssetsCollection,
  PresenceCollection,
  MessageCollection,
} from '../collections';

export * from './apps';
export * from './boards';
export * from './rooms';
export * from './users';
export * from './assets';
export * from './presence';
export * from './message';

/**
 * Load the various models at startup.
 */
export async function loadCollections(): Promise<void> {
  await AppsCollection.initialize();
  await BoardsCollection.initialize();
  await RoomsCollection.initialize();
  await UsersCollection.initialize();
  await AssetsCollection.initialize();
  await MessageCollection.initialize(true, 60); // clear, and TTL 1min
  await PresenceCollection.initialize(true);

  // Setup default room and board
  RoomsCollection.getAll().then(async (rooms) => {
    if (rooms) {
      if (rooms.length > 0) {
        console.log(`Rooms> Loaded ${rooms.length} room(s) from store`);
      } else {
        const res = await RoomsCollection.add(
          {
            name: 'Main Room',
            description: 'Builtin default room',
            color: 'green',
            ownerId: '-',
            isPrivate: false,
            privatePin: '',
            isListed: true,
          },
          '-'
        );
        if (res?._id) {
          console.log('Rooms> default room added');
          const res2 = await BoardsCollection.add(
            {
              name: 'Main Board',
              description: 'Builtin default board',
              color: 'green',
              roomId: res._id,
              ownerId: '-',
              isPrivate: false,
              privatePin: '',
            },
            '-'
          );
          if (res2?._id) {
            console.log('Boards> default board addedd');
          }
        }
      }
    }
  });
}
