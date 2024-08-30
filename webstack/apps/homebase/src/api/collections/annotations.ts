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
    await super.initialize(clear, ttl);

    // Transition to new collection
    const boards = await BoardsCollection.getAll();
    const annotations = await AnnotationsCollection.getAll();
    if (boards && annotations) {
      for (const board of boards) {
        // if no annotation exists for the board
        if (!annotations.find((a) => a._id === board._id)) {
          // Add the missing entry
          await AnnotationsCollection.add({ whiteboardLines: [] }, board._createdBy, board._id);
        }
        // if the board has annotations
        if (board.data.whiteboardLines && board.data.whiteboardLines.length > 0) {
          // need to move the annotations to the new collection
          await AnnotationsCollection.update(board._id, board._createdBy, { whiteboardLines: board.data.whiteboardLines });
          // Clear the board of annotations
          await BoardsCollection.update(board._id, board._createdBy, { whiteboardLines: [] });
        }
      }
    }
    // Subscribe to the board collection to keep in sync
    await this.subscribeToBoards();
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
