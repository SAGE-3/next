/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { LinkSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

class SAGE3LinkCollection extends SAGE3Collection<LinkSchema> {
  constructor() {
    super('LINK', { boardId: '' });
    const router = sageRouter<LinkSchema>(this);
    this.httpRouter = router;
  }
}

export const LinkCollection = new SAGE3LinkCollection();
