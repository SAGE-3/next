/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The BoardService for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { BoardModel } from '../models';
import { BoardSchema } from '@sage3/shared/types';
import { SBDocumentMessage } from '@sage3/sagebase';
import { randomSAGEColor, genId } from '@sage3/shared'


/**
 * The SAGE3 BoardService that interfaces with the BoardModel
 */
class SAGE3BoardService {

  /**
   * Check if a board exists in the database
   * @returns {boolean} true if the user exists in the database, false otherwise.
   */
  public async boardCheck(id: string): Promise<boolean> {
    const board = await BoardModel.readBoard(id);
    const reponse = (board) ? true : false;
    return reponse;
  }

  /**
   * Create a new board in the database.
   * @param {string} name The name of the board.
   * @param {string} description The description of the board.
   * @param {string} ownerId The id of the user who created the board.
   * @returns {BoardSchema | undefined} Returns the BoardSchema or undefined if unsuccessful
   */
  public async create(name: string, description: string, ownerId: string, roomId: string): Promise<BoardSchema | undefined> {
    const id = genId();
    const newBoard = {
      id: id,
      name: name,
      description: description,
      color: randomSAGEColor().name,
      roomId,
      ownerId: ownerId,
      isPrivate: false
    } as BoardSchema;

    try {
      const doc = await BoardModel.createBoard(id, newBoard);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('BoardService createBoard error> ', error);
      return undefined;
    }
  }

  /**
   * Read a board.
   * @param {string} id The board's unique id.
   * @return {BoardSchema | undefined} Returns the board if the read was sucessful.
   */
  public async read(id: string): Promise<BoardSchema | undefined> {
    try {
      const doc = await BoardModel.readBoard(id);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('BoardService readBoard error: ', error);
      return undefined;
    }
  }


  /**
   * Read all boards.
   * @return {BoardSchema[] | undefined} Returns an array of boards if the read was sucessful.
   */
  public async readAll(): Promise<BoardSchema[] | undefined> {
    try {
      const docArray = await BoardModel.readAllBoards();
      const docs = docArray.map(doc => doc.data) as BoardSchema[];
      return (docs) ? docs : undefined;
    } catch (error) {
      console.log('BoardService readAllBoards error: ', error);
      return undefined;
    }
  }

  /**
* Query the Boards.
* @return {BoardSchema[] | undefined} Returns an array of apps if the query was sucessful.
*/
  public async query(field: keyof BoardSchema, query: Partial<BoardSchema>): Promise<BoardSchema[] | undefined> {
    try {
      const docArray = await BoardModel.queryBoards(field, query);
      if (docArray === undefined) return undefined;
      const boards = docArray.map(doc => doc.data) as BoardSchema[];
      return boards;
    } catch (error) {
      console.log('AppService query error: ', error);
      return undefined;
    }
  }


  /**
   * Update the board's name.
   * @param {string} id The board's unique id.
   * @param {string} name The new name.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async update(id: string, update: Partial<BoardSchema>): Promise<boolean> {
    try {
      const success = await BoardModel.updateBoard(id, update);
      return success;
    } catch (error) {
      console.log('BoardService updateName error: ', error);
      return false;
    }
  }

  /**
 * Delete a board in the database.
 * @param {string} id The id of the board.
 * @returns {boolean} Returns true if delete was successful
 */
  public async delete(id: string): Promise<boolean> {
    try {
      const success = await BoardModel.deleteBoard(id);
      return success;
    } catch (error) {
      console.log('BoardService deleteBoard error> ', error);
      return false;
    }
  }

  /**
  * Subscribe to a board in the database.
  * @param {string} id The id of the board
  * @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
  */
  public async subscribeToBoard(id: string, callback: (message: SBDocumentMessage<BoardSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await BoardModel.subscribeToBoard(id, callback);
      return subscription;
    } catch (error) {
      console.log('BoardService subscribeToBoard error> ', error);
      return undefined;
    }
  }

  /**
  * Subscribe to all boards in the database.
  * @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
  */
  public async subscribetoAllBoards(callback: (message: SBDocumentMessage<BoardSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await BoardModel.subscribeToBoards(callback);
      return subscription;
    } catch (error) {
      console.log('BoardService subscribetoAllBoards error> ', error);
      return undefined;
    }
  }

  /**
* Subscribe to all boards if a specific room.
* @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
*/
  public async subscribeByRoomId(roomId: string, callback: (message: SBDocumentMessage<BoardSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await BoardModel.subscribeByRoomId(roomId, callback);
      return subscription;
    } catch (error) {
      console.log('BoardService subscribeToRoomBoards error> ', error);
      return undefined;
    }
  }

}


export const BoardService = new SAGE3BoardService();