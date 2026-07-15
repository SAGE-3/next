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
    // Live annotation sync is handled by Yjs; the collection is only cold
    // storage.  Opt out of per-update broadcasts so a stroke commit doesn't
    // re-broadcast the entire whiteboardLines array to every subscriber.
    super('ANNOTATIONS', {}, { publishUpdates: false });
    const router = sageRouter<AnnotationSchema>(this);

    // Incremental append: add whiteboard strokes without rewriting the whole
    // array.  Committing a stroke sends only the new shape(s) (O(stroke))
    // instead of the full whiteboardLines array (O(board)).  Removes/clears
    // still go through the generic full-array PUT, which also reconciles drift.
    router.post('/:id/lines', async ({ params, body, user }, res) => {
      const userId = (user as { id?: string })?.id || '-';
      const lines = body?.lines;
      if (!Array.isArray(lines) || lines.length === 0) {
        res.status(400).send({ success: false, message: 'Body must include a non-empty "lines" array.' });
        return;
      }
      const ok = await this.appendLines(params.id, lines, userId);
      if (ok) res.status(200).send({ success: true, message: 'Successfully appended lines.' });
      else res.status(500).send({ success: false, message: 'Failed to append lines.' });
    });

    this.httpRouter = router;
  }

  /**
   * Append whiteboard strokes to a board's annotation document without
   * rewriting the existing array.  Broadcast is suppressed (live sync is Yjs).
   */
  public async appendLines(id: string, lines: unknown[], by: string): Promise<boolean> {
    try {
      const response = await this.collection.docRef(id).arrayAppend('whiteboardLines', lines, by, false);
      return !!response.success;
    } catch (error) {
      console.error('AnnotationsCollection appendLines error:', error);
      return false;
    }
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

  // Delete all annotations on a board
  public async deleteAnnotationsOnBoard(boardId: string): Promise<boolean> {
    const success = await this.delete(boardId);
    return success ? true : false;
  }
}

export const AnnotationsCollection = new SAGE3AnnotationsCollection();
