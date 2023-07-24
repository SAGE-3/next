/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { BoardSchema } from '@sage3/shared/types';
import { CollectionRule, SAGE3Collection, SAGEAuthorization, sageRouter } from '@sage3/backend';

class SAGE3BoardsCollection extends SAGE3Collection<BoardSchema> {
  constructor() {
    super('BOARDS', {
      name: '',
      ownerId: '',
      roomId: '',
    });

    const router = sageRouter<BoardSchema>(this);
    this.httpRouter = router;

    const BoardsCollectionRules = [
      {
        refPropName: 'roomId',
        membershipCollection: 'ROOM_MEMBERS',
        roles: ['owner', 'admin'],
        availableActions: ['create', 'update', 'read', 'delete'],
      },
      {
        refPropName: 'roomId',
        membershipCollection: 'ROOM_MEMBERS',
        roles: ['member'],
        availableActions: ['read'],
      },
    ] as CollectionRule[];
    SAGEAuthorization.addProtectedCollection(this, BoardsCollectionRules);
    this._authorization = SAGEAuthorization;
  }
}

export const BoardsCollection = new SAGE3BoardsCollection();
