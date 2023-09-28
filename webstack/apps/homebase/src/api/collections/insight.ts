/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { InsightSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';
import { AppsCollection } from './apps';

class SAGE3InsightCollection extends SAGE3Collection<InsightSchema> {
  constructor() {
    super('INSIGHT', {
      roomId: '', // index to query
    });
    const router = sageRouter<InsightSchema>(this);
    this.httpRouter = router;
  }

  /**
   * Initialize the collection
   * @param clear Clear the whole collection before initializing
   */
  public async initialize(clear?: boolean, ttl?: number): Promise<void> {
    super.initialize(clear, ttl);
    this.subscribeToApps();
  }

  /**
   * Subscribe to the Apps Collection to create an insight document for each app
   */
  async subscribeToApps() {
    // Subscribe to Presence Collection
    await AppsCollection.subscribeAll((message) => {
      switch (message.type) {
        case 'CREATE': {
          for (const doc of message.doc) {
            // for each new app, add an insight document
            this.add({ app_id: doc._id, roomId: doc.data.roomId, labels: [] }, doc._createdBy, doc._id);
          }
          break;
        }
        case 'DELETE': {
          // delete the insight documents for each app
          for (const doc of message.doc) {
            this.delete(doc._id);
          }
          break;
        }
      }
    });
  }
}

export const InsightCollection = new SAGE3InsightCollection();
