/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { BoardSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

import { AnnotationsCollection } from './annotations';
import { AppsCollection } from './apps';
import { InsightCollection } from './insight';

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
    this.httpRouter = router;
  }

  // Delete all the boards of a specific user
  public async deleteUsersBoards(userId: string): Promise<BoardDeleteInfo[]> {
    // Delete the boards of the user
    const userBoards = await this.query('ownerId', userId);
    const boardsIds = userBoards ? userBoards.map((board) => board._id) : [];
    // Promise all delete using deleteBoard
    const boardsDeleted = await Promise.all(boardsIds.map((boardId) => this.deleteBoard(boardId)));
    return boardsDeleted;
  }

  // Delete all the boards in a specific room
  public async deleteBoardsInRoom(roomId: string): Promise<BoardDeleteInfo[]> {
    // Delete the boards in the room
    const roomBoards = await this.query('roomId', roomId);
    const boardsIds = roomBoards ? roomBoards.map((board) => board._id) : [];
    const boardsDeleteInfo = [];
    for (const boardId of boardsIds) {
      const boardDeleteInfo = await this.deleteBoard(boardId);
      boardsDeleteInfo.push(boardDeleteInfo);
    }
    return boardsDeleteInfo;
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
    // Delete the board
    const boardDeleted = await this.delete(boardId);
    results.boardDeleted = boardDeleted ? true : false;
    // Delete the apps of the board
    const appsDeleted = await AppsCollection.deleteAppsOnBoard(boardId);
    results.appsDeleted = appsDeleted;
    // Delete the annotations of the board
    const annotationsDeleted = await AnnotationsCollection.deleteAnnotationsOnBoard(boardId);
    results.annotationsDeleted = annotationsDeleted;
    // Delete the insights of the board
    const insightsDeleted = await InsightCollection.deleteInsightsOnBoard(boardId);
    results.insightsDeleted = insightsDeleted;
    return results;
  }
}

export const BoardsCollection = new SAGE3BoardsCollection();
