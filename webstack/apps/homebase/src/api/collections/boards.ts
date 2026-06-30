/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppName } from '@sage3/applications/schema';
import { BoardSchema, Position, Size } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

import { AnnotationsCollection } from './annotations';
import { AppsCollection } from './apps';
import { InsightCollection } from './insight';

// Minimal app info needed for board preview rendering
type AppPreviewInfo = { position: Position; size: Size; type: AppName; id: string };

// Server-side cache: boardId -> { apps, timestamp }
// Absorbs burst traffic when multiple users load the homepage simultaneously
const previewCache = new Map<string, { apps: AppPreviewInfo[]; timestamp: number }>();
const PREVIEW_CACHE_TTL = 30 * 1000; // 30 seconds

export type BoardDeleteInfo = {
  boardId: string;
  boardDeleted: boolean;
  appsDeleted: number;
  annotationsDeleted: boolean;
  insightsDeleted: number;
};

class SAGE3BoardsCollection extends SAGE3Collection<BoardSchema> {
  constructor() {
    super('BOARDS', {
      name: '',
      ownerId: '',
      roomId: '',
    });
    const router = sageRouter<BoardSchema>(this);

    // Batch preview: returns app layout (position/size/type) for multiple boards in one request.
    // Used by the homepage to render spatial previews without subscribing to app data.
    router.post('/preview', async ({ body }, res) => {
      const boardIds = body.boardIds as string[];
      const force = body.force === true;
      if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
        res.status(400).send({ success: false, message: 'No boardIds provided.' });
        return;
      }

      const now = Date.now();
      const result: Record<string, AppPreviewInfo[]> = {};
      const uncached: string[] = [];

      // Serve from cache where available (skipped when force=true)
      for (const boardId of boardIds) {
        const cached = previewCache.get(boardId);
        if (!force && cached && now - cached.timestamp < PREVIEW_CACHE_TTL) {
          result[boardId] = cached.apps;
        } else {
          uncached.push(boardId);
        }
      }

      // Fetch uncached boards in parallel
      if (uncached.length > 0) {
        const fetched = await Promise.all(
          uncached.map(async (boardId) => {
            const docs = await AppsCollection.query('boardId', boardId);
            const apps = (docs || []).map((app) => ({
              position: app.data.position,
              size: app.data.size,
              type: app.data.type,
              id: app._id,
            }));
            previewCache.set(boardId, { apps, timestamp: now });
            return { boardId, apps };
          })
        );
        fetched.forEach(({ boardId, apps }) => {
          result[boardId] = apps;
        });
      }

      res.status(200).send({ success: true, data: result });
    });

    this.httpRouter = router;
  }

  // Delete all boards owned by a specific user
  public async deleteUsersBoards(userId: string): Promise<BoardDeleteInfo[]> {
    const userBoards = await this.query('ownerId', userId);
    const boardsIds = userBoards ? userBoards.map((board) => board._id) : [];
    const boardsDeleted = await Promise.all(boardsIds.map((boardId) => this.deleteBoard(boardId)));
    return boardsDeleted;
  }

  // Delete all boards in a specific room
  public async deleteBoardsInRoom(roomId: string): Promise<BoardDeleteInfo[]> {
    const roomBoards = await this.query('roomId', roomId);
    const boardsIds = roomBoards ? roomBoards.map((board) => board._id) : [];
    const boardsDeleteInfo = [];
    for (const boardId of boardsIds) {
      const boardDeleteInfo = await this.deleteBoard(boardId);
      boardsDeleteInfo.push(boardDeleteInfo);
    }
    return boardsDeleteInfo;
  }

  // Transfer ownership of all boards from one user to another
  public async transferUsersBoards(oldUserId: string, newOwnerId: string): Promise<boolean> {
    const userBoards = await this.query('ownerId', oldUserId);
    const boardsIds = userBoards ? userBoards.map((board) => board._id) : [];
    const res = await Promise.all(boardsIds.map((boardId) => this.update(boardId, newOwnerId, { ownerId: newOwnerId })));
    return res ? true : false;
  }

  /**
   * This will delete the board and all the associated apps, annotations, and insights
   * @param boardId The id of the board you want to delete
   * @returns The information about the deletion
   */
  public async deleteBoard(boardId: string): Promise<BoardDeleteInfo> {
    const results = {
      boardId,
      boardDeleted: false,
      appsDeleted: 0,
      annotationsDeleted: false,
      insightsDeleted: 0,
    } as BoardDeleteInfo;
    // Evict cached preview so stale app layout is not served after deletion
    previewCache.delete(boardId);

    const boardDeleted = await this.delete(boardId);
    results.boardDeleted = boardDeleted ? true : false;

    const appsDeleted = await AppsCollection.deleteAppsOnBoard(boardId);
    results.appsDeleted = appsDeleted;

    const annotationsDeleted = await AnnotationsCollection.deleteAnnotationsOnBoard(boardId);
    results.annotationsDeleted = annotationsDeleted;

    const insightsDeleted = await InsightCollection.deleteInsightsOnBoard(boardId);
    results.insightsDeleted = insightsDeleted;
    return results;
  }
}

export const BoardsCollection = new SAGE3BoardsCollection();
