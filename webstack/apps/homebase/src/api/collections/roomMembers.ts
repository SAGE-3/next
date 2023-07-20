/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RoomMembersSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

class SAGE3RoomMembersCollection extends SAGE3Collection<RoomMembersSchema> {
  constructor() {
    super('ROOM_MEMBERS', {
      roomId: '',
    });

    const router = sageRouter<RoomMembersSchema>(this);
    this.httpRouter = router;
  }
}

export const RoomMembersCollection = new SAGE3RoomMembersCollection();
