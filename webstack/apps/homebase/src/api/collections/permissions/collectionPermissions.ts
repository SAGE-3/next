import { CollectionRule, SAGEAuth } from '@sage3/backend';
import { AppsCollection, RoomsCollection, UsersCollection } from '../';

import { RoomMembersCollection } from './roomMembers';

// Authorization Initialization
export function InitalizeAuthorization() {
  // Initialize Authorization with UsersCollection
  SAGEAuth.initialize(UsersCollection, RoomMembersCollection);

  const RoomsCollectionRules = [
    {
      refId_By_DocPropName: 'roomId',
      collection: 'ROOM_MEMBERS',
      roles: ['owner'],
      checkActions: ['update', 'delete'],
    },
    {
      refId_By_DocPropName: 'roomId',
      collection: 'ROOM_MEMBERS',
      roles: ['owner', 'admin', 'member'],
      checkActions: ['read'],
    },
  ] as CollectionRule[];
  SAGEAuth.addProtectedCollection(RoomsCollection, RoomsCollectionRules);

  const AppsCollectionRules = [
    {
      refId_By_DocPropName: 'roomId',
      collection: 'ROOM_MEMBERS',
      roles: ['owner', 'admin', 'member'],
      checkActions: ['create', 'read', 'update', 'delete'],
    },
  ] as CollectionRule[];
  SAGEAuth.addProtectedCollection(AppsCollection, AppsCollectionRules);
}
