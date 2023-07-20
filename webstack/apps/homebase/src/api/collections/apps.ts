/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppSchema } from '@sage3/applications/schema';
import { CollectionRule, SAGE3Collection, SAGEAuth, sageRouter } from '@sage3/backend';

class SAGE3AppsCollection extends SAGE3Collection<AppSchema> {
  constructor() {
    super('APPS', {
      roomId: '',
      boardId: '',
      type: 'Stickie',
    });
    const router = sageRouter<AppSchema>(this);
    this.httpRouter = router;

    const AppsCollectionRules = [
      {
        refId_By_DocPropName: 'roomId',
        collection: 'ROOM_MEMBERS',
        roles: ['owner', 'admin', 'member'],
        availableActions: ['create', 'read', 'update', 'delete'],
      },
    ] as CollectionRule[];
    SAGEAuth.addProtectedCollection(this, AppsCollectionRules);
    this._authorization = SAGEAuth;
  }
}

export const AppsCollection = new SAGE3AppsCollection();
