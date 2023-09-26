/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { InsightSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

class SAGE3InsightCollection extends SAGE3Collection<InsightSchema> {
  constructor() {
    super('INSIGHT', {
      app_id: '',
      labels: [],
    });
    const router = sageRouter<InsightSchema>(this);
    this.httpRouter = router;
  }
}

export const InsightCollection = new SAGE3InsightCollection();
