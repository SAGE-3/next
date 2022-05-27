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
import { randomSAGEColor, SAGEColors, genId } from '@sage3/shared'


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
  public async createBoard(name: string, description: string, ownerId: string, roomId: string): Promise<BoardSchema | undefined> {
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
  public async readBoard(id: string): Promise<BoardSchema | undefined> {
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
  public async readAllBoards(): Promise<BoardSchema[] | undefined> {
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
 * Read all boards.
 * @return {BoardSchema[] | undefined} Returns an array of boards if the read was sucessful.
 */
  public async readByRoomId(roomId: string): Promise<BoardSchema[] | undefined> {
    try {
      const docArray = await BoardModel.queryBoards('roomId', roomId);
      if (docArray == undefined) return undefined;
      const boards = docArray.map(doc => doc.data) as BoardSchema[];
      return boards;
    } catch (error) {
      console.log('BoardService readAllBoards error: ', error);
      return undefined;
    }
  }

  /**
   * Update the board's name.
   * @param {string} id The board's unique id.
   * @param {string} name The new name.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateName(id: string, name: string): Promise<boolean> {
    try {
      const success = await BoardModel.updateBoard(id, { "name": name });
      return success;
    } catch (error) {
      console.log('BoardService updateName error: ', error);
      return false;
    }
  }

  /**
   * Update the board's description.
   * @param {string} id The board's unique id.
   * @param {string} description The new description.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateDescription(id: string, description: string): Promise<boolean> {
    try {
      const success = await BoardModel.updateBoard(id, { "description": description });
      return success;
    } catch (error) {
      console.log('BoardService updateDescription error: ', error);
      return false;
    }
  }

  /**
   * Update the board's color.
   * @param {string} id The board's unique id.
   * @param {string} color The new color.
   * @return {Promise<boolean>} Returns true if action was succesful.
   */
  public async updateColor(id: string, color: string): Promise<boolean> {
    try {
      // Check to see if new color name is an actual sage color
      const found = SAGEColors.some(el => el.name === color);
      if (!found) return false;
      const success = await BoardModel.updateBoard(id, { "color": color });
      return success;
    } catch (error) {
      console.log('BoardService updateColor error: ', error);
      return false;
    }
  }

  /**
   * Update the board's ownerId. This is transferring ownership to a new user.
   * @param {string} id The board's unique id.
   * @param {string} ownerId The id of the new owner.
   * @return {Promise<boolean>} Returns true if action was succesful.
   */
  public async updateOwnerId(id: string, ownerId: string): Promise<boolean> {
    try {
      const success = await BoardModel.updateBoard(id, { "ownerId": ownerId });
      return success;
    } catch (error) {
      console.log('BoardService updateOwnerId error: ', error);
      return false;
    }
  }

  /**
 * Update the board's roomId. This is transferring ownership to a new room.
 * @param {string} id The board's unique id.
 * @param {string} roomId The id of the new room.
 * @return {Promise<boolean>} Returns true if action was succesful.
 */
  public async updateRoomId(id: string, roomId: string): Promise<boolean> {
    try {
      const success = await BoardModel.updateBoard(id, { "roomId": roomId });
      return success;
    } catch (error) {
      console.log('BoardService updateRoomId error: ', error);
      return false;
    }
  }

  /**
   * Update the board's private state.
   * @param {string} id The board's unique id.
   * @param {boolean} isPrivate The new type.
   * @return {Promise<boolean>} Returns true if action was successful.
   */
  public async updateIsPrivate(id: string, isPrivate: boolean): Promise<boolean> {
    try {
      const success = await BoardModel.updateBoard(id, { "isPrivate": isPrivate });
      return success;
    } catch (error) {
      console.log('BoardService updateIsPrivate error: ', error);
      return false;
    }
  }

  /**
 * Delete a board in the database.
 * @param {string} id The id of the board.
 * @returns {boolean} Returns true if delete was successful
 */
  public async deleteBoard(id: string): Promise<boolean> {
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