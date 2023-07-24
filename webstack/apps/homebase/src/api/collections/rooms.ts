/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RoomSchema } from '@sage3/shared/types';
import { CollectionRule, SAGE3Collection, SAGEAuthorization, sageRouter } from '@sage3/backend';

class SAGE3RoomsCollection extends SAGE3Collection<RoomSchema> {
  constructor() {
    super('ROOMS', {
      name: '',
      ownerId: '',
    });

    const router = sageRouter<RoomSchema>(this);
    this.httpRouter = router;

    const RoomsCollectionRules = [
      {
        refPropName: 'roomId',
        membershipCollection: 'ROOM_MEMBERS',
        roles: ['owner'],
        availableActions: ['update', 'read', 'delete'],
      },
    ] as CollectionRule[];
    SAGEAuthorization.addProtectedCollection(this, RoomsCollectionRules);
    this._authorization = SAGEAuthorization;
  }
}

export const RoomsCollection = new SAGE3RoomsCollection();
