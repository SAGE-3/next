/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PresenceSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

class SAGE3PresenceCollection extends SAGE3Collection<PresenceSchema> {
  constructor() {
    super('PRESENCE', {
      userId: '',
      status: 'online',
      roomId: '',
      boardId: '',
    });
    const router = sageRouter<PresenceSchema>(this);
    this.httpRouter = router;
  }
}

export const PresenceCollection = new SAGE3PresenceCollection();
