/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { URLMetadata } from '@sage3/backend';
import { generateReadableID } from '@sage3/shared';
import { throttle } from 'throttle-debounce';
import {
  AppsCollection,
  AssetsCollection,
  BoardsCollection,
  RoomsCollection,
  UsersCollection,
  PresenceCollection,
  MessageCollection,
  PluginsCollection,
  InsightCollection,
  RoomMembersCollection,
  AnnotationsCollection,
  LinkCollection,
} from '../collections';

export * from './apps';
export * from './boards';
export * from './rooms';
export * from './users';
export * from './assets';
export * from './presence';
export * from './message';
export * from './plugins';
export * from './insight';
export * from './roommembers';
export * from './annotations';
export * from './link';

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
  await PresenceCollection.initialize();
  await PluginsCollection.initialize();
  await InsightCollection.initialize();
  await RoomMembersCollection.initialize();
  await AnnotationsCollection.initialize();
  await LinkCollection.initialize();

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
              code: generateReadableID(),
              isPrivate: false,
              privatePin: '',
              executeInfo: { executeFunc: '', params: {} },
            },
            '-'
          );
          if (res2?._id) {
            console.log('Boards> default board addedd');
            // Add an annotation document for the board
            AnnotationsCollection.add({ whiteboardLines: [] }, '-', res2._id);
          }
        }
      }
    }
  });

  // Check all links for orphaned references
  async function checkAllLinks() {
    console.log('Running full link validation check after app deletion...');
    const links = await LinkCollection.getAll();
    const apps = await AppsCollection.getAll();
    if (!links || !apps) return;
    
    const appIds = new Set(apps.map(app => app._id));
    const invalidLinks = links.filter(link => 
      !appIds.has(link.data.sourceAppId) || !appIds.has(link.data.targetAppId)
    );
    
    if (invalidLinks.length > 0) {
      console.log(`Found ${invalidLinks.length} orphaned links, cleaning up...`);
      const invalidLinkIds = invalidLinks.map(link => link._id);
      console.log('Deleting orphaned links:', invalidLinkIds);
      
      // Use batch deletion for better performance
      const result = await LinkCollection.deleteBatch(invalidLinkIds);
      if (result) {
        console.log(`Successfully deleted ${result.length} orphaned links`);
      } else {
        console.log('Failed to delete some orphaned links');
      }
    } else {
      console.log('No orphaned links found');
    }
  }

  // Throttled version - runs immediately, then ignores calls for 5 seconds
  const throttledCheckAllLinks = throttle(5000, checkAllLinks);

  // Listen for apps changes
  AppsCollection.subscribeAll((message) => {
    if (message.type === 'CREATE') {
      message.doc.forEach((doc) => {
        if (doc.data.type === 'WebpageLink') {
          URLMetadata(doc.data.state.url).then((metadata) => {
            AppsCollection.update(doc._id, 'NODE_SERVER', { state: { ...doc.data.state, meta: metadata } });
          });
        }
      });
    } else if (message.type === 'DELETE') {
      // Check all links when any app is deleted (with throttle)
      throttledCheckAllLinks();
    }
  });

  // Remove all temporary user accounts at server startup
  UsersCollection.removeAllTemporaryAccount();
}
