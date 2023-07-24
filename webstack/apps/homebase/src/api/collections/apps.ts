/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppSchema } from '@sage3/applications/schema';
import { CollectionRule, SAGE3Collection, SAGEAuthorization, sageRouter } from '@sage3/backend';
import { defineScript } from 'redis';

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
        refPropName: 'roomId',
        membershipCollection: 'ROOM_MEMBERS',
        roles: ['owner', 'admin', 'member'],
        availableActions: ['read', 'update', 'delete'],
      },
    ] as CollectionRule[];

    //
    /**
     *
     *
     *  {
     * name
     * description
     * roomId: string
     * }
     *
     */
    SAGEAuthorization.addProtectedCollection(this, AppsCollectionRules);
    this._authorization = SAGEAuthorization;
  }
}

export const AppsCollection = new SAGE3AppsCollection();
