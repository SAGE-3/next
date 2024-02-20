/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AnnotationSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';
import { BoardsCollection } from './boards';

class SAGE3AnnotationsCollection extends SAGE3Collection<AnnotationSchema> {
  constructor() {
    super('ANNOTATIONS', {});
    const router = sageRouter<AnnotationSchema>(this);
    this.httpRouter = router;
  }

  /**
   * Initialize the collection
   * @param clear Clear the whole collection before initializing
   */
  public async initialize(clear?: boolean, ttl?: number): Promise<void> {
    super.initialize(clear, ttl);
    this.subscribeToBoards();
  }

  /**
   * Subscribe to the Apps Collection to create an insight document for each app
   */
  async subscribeToBoards() {
    // Subscribe to Presence Collection
    await BoardsCollection.subscribeAll((message) => {
      switch (message.type) {
        case 'CREATE': {
          for (const doc of message.doc) {
            // for each new app, add an annotation document, same _id as the board
            this.add({ whiteboardLines: [] }, doc._createdBy, doc._id);
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

export const AnnotationsCollection = new SAGE3AnnotationsCollection();
