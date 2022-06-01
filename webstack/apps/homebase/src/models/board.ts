/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The Board database model.
 *
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 *
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { SAGEBase, SBCollectionRef, SBDocument, SBDocumentMessage, SBDocumentUpdate } from '@sage3/sagebase';
import { BoardSchema } from '@sage3/shared/types';

/**
 * The database model for SAGE3 boards.
 */
class SAGE3BoardModel {
  private boardCollection!: SBCollectionRef<BoardSchema>;
  private collectionName = 'BOARDS';

  /**
   * Contructor initializing the BoardModel.
   */
  public async initialize(): Promise<void> {
    const indexObj = {
      name: '',
      ownerId: '',
      roomId: '',
    } as BoardSchema;
    this.boardCollection = await SAGEBase.Database.collection<BoardSchema>(this.collectionName, indexObj);
  }

  /**
   * Create a new board in the database.
   * @param {string} id The boards's unique id.
   * @param {BoardSchema} newBoard The new board to add to the database
   * @returns {Promise<boolean>} Returns true if board was succesfully created.
   */
  public async createBoard(id: string, newRoom: BoardSchema): Promise<SBDocument<BoardSchema> | undefined> {
    try {
      const docRef = await this.boardCollection.addDoc(newRoom, id);
      if (docRef) {
        const doc = await docRef.read();
        return doc;
      } else {
        return undefined;
      }
    } catch (error) {
      console.log('BoardModel createBoard error> ', error);
      return undefined;
    }
  }

  /**
   * Get board by their unique id.
   * @param {string} id The board's unique id.
   * @returns {BoardSchema | undefined} A BoardSchema of the board. Return undefined if no such board.
   */
  public async readBoard(id: string): Promise<SBDocument<BoardSchema> | undefined> {
    try {
      const board = await this.boardCollection.docRef(id).read();
      return board;
    } catch (error) {
      console.log('BoardModel readBoard error> ', error);
      return undefined;
    }
  }

  /**
   * Returns all boards for this SAGE3 server.
   * @returns {Array<SBDocument<BoardSchema>>} BoardSchema array of all boards
   */
  public async readAllBoards(): Promise<SBDocument<BoardSchema>[]> {
    try {
      const users = await this.boardCollection.getAllDocs();
      return users;
    } catch (error) {
      console.log('BoardModel readAllBoards error> ');
      return [];
    }
  }

  /**
   * Query boards
   * @param {string} id The roomId.
   * @returns {Array<SBDocument<BoardSchema>>} BoardSchema array of all boards
   */
  public async queryBoards(field: keyof BoardSchema, query: Partial<BoardSchema>): Promise<SBDocument<BoardSchema>[] | undefined> {
    try {
      const q = query[field];
      if (typeof q !== 'string' || typeof q !== typeof 'number') return undefined;
      const boards = await this.boardCollection.query(field, q);
      return boards;
    } catch (error) {
      console.log('BoardModel readBoard error> ', error);
      return undefined;
    }
  }

  /**
   * Update the board doc in the database.
   * @param {string} id The boards's unique id.
   * @param {SBDocumentUpdate<RoomSchema>} update The update values for the doc.
   * @return {Promise<boolean>} Returns true if update was succesful.
   */
  public async updateBoard(id: string, update: SBDocumentUpdate<BoardSchema>): Promise<boolean> {
    try {
      const response = await this.boardCollection.docRef(id).update(update);
      return response.success;
    } catch (error) {
      console.log('BoardModel updateBoard error: ', error);
      return false;
    }
  }

  /**
   * Delete a board in the database.
   * @param {string} id The id of the board
   * @returns {boolean} Returns true if deletion was successful
   */
  public async deleteBoard(id: string): Promise<boolean> {
    try {
      const response = await this.boardCollection.docRef(id).delete();
      return response.success;
    } catch (error) {
      console.log('BoardModel deleteBoard error> ', error);
      return false;
    }
  }

  /**
   * Subscribe to the Board Collection
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeToBoards(callback: (message: SBDocumentMessage<BoardSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this.boardCollection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('BoardModel subscribeToBoards error>', error);
      return undefined;
    }
  }

  /**
   * Subscribe to a specific board
   * @param {string} id the id of the board
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
 
   */
  public async subscribeToBoard(
    id: string,
    callback: (message: SBDocumentMessage<BoardSchema>) => void
  ): Promise<(() => Promise<void>) | undefined> {
    try {
      const board = this.boardCollection.docRef(id);
      const unsubscribe = await board.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('BoardModel subscribeToBoard error>', error);
      return undefined;
    }
  }

  /**
   * Subscribe to a room's board's
   * @param {string} id the id of the room
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeByRoomId(
    id: string,
    callback: (message: SBDocumentMessage<BoardSchema>) => void
  ): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = this.boardCollection.subscribeToQuery('roomId', id, callback);
      return unsubscribe;
    } catch (error) {
      console.log('BoardModel subscribeToRoomBoards error>', error);
      return undefined;
    }
  }
}

export const BoardModel = new SAGE3BoardModel();
