/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The AppService for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { AppModel } from '../models';
import { SBDocumentMessage } from '@sage3/sagebase';
import { genId } from '@sage3/shared'
import { AppSchema, AppStates, AppTypes } from '@sage3/shared/types';


/**
 * The SAGE3 AppService that interfaces with the AppModel
 */
class SAGE3AppService {

  /**
   * Check if a app exists in the database
   * @returns {boolean} true if the app exists in the database, false otherwise.
   */
  public async appCheck(id: string): Promise<boolean> {
    const app = await AppModel.readApp(id);
    const reponse = (app) ? true : false;
    return reponse;
  }

  /**
   * Create a new app in the database.
   * @param {string} name The name of the app.
   * @param {string} description The description of the app.
   * @param {string} ownerId The id of the user who created the app.
   * @param {string} boardId The id of the board which the app belongs to.
   * @param {string} roomId The id of the room which the app belongs to.
   * @param {string} type the type of app
   * @returns {AppSchema | undefined} Returns the AppSchema or undefined if unsuccessful
   */
  public async createApp(name: string, description: string, ownerId: string, roomId: string, boardId: string, type: AppTypes, state: AppStates): Promise<AppSchema | undefined> {
    const id = genId();
    const newApp = {
      id: id,
      name: name,
      description: description,
      roomId,
      ownerId,
      boardId,
      type,
      state
    } as AppSchema;

    try {
      const doc = await AppModel.createApp(id, newApp);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('AppService createApp error> ', error);
      return undefined;
    }
  }

  /**
   * Read a app.
   * @param {string} id The app's unique id.
   * @return {AppSchema | undefined} Returns the app if the read was sucessful.
   */
  public async readApp(id: string): Promise<AppSchema | undefined> {
    try {
      const doc = await AppModel.readApp(id);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('AppService readApp error: ', error);
      return undefined;
    }
  }


  /**
   * Read all apps.
   * @return {AppSchema[] | undefined} Returns an array of apps if the read was sucessful.
   */
  public async readAllApps(): Promise<AppSchema[] | undefined> {
    try {
      const docArray = await AppModel.readAllApps();
      const docs = docArray.map(doc => doc.data) as AppSchema[];
      return (docs) ? docs : undefined;
    } catch (error) {
      console.log('AppService readAllApps error: ', error);
      return undefined;
    }
  }

  /**
 * Read all apps within a room.
 * @return {AppSchema[] | undefined} Returns an array of apps if the read was sucessful.
 */
  public async readByRoomId(roomId: string): Promise<AppSchema[] | undefined> {
    try {
      const docArray = await AppModel.queryApps('roomId', roomId);
      if (docArray == undefined) return undefined;
      const boards = docArray.map(doc => doc.data) as AppSchema[];
      return boards;
    } catch (error) {
      console.log('AppService readByRoomId error: ', error);
      return undefined;
    }
  }

  /**
* Read all apps within a board.
* @return {AppSchema[] | undefined} Returns an array of apps if the read was sucessful.
*/
  public async readByBoardId(boardId: string): Promise<AppSchema[] | undefined> {
    try {
      const docArray = await AppModel.queryApps('boardId', boardId);
      if (docArray == undefined) return undefined;
      const apps = docArray.map(doc => doc.data) as AppSchema[];
      return apps;
    } catch (error) {
      console.log('AppService readByBoardId error: ', error);
      return undefined;
    }
  }

  /**
   * Update the app's name.
   * @param {string} id The app's unique id.
   * @param {string} name The new name.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateName(id: string, name: string): Promise<boolean> {
    try {
      const success = await AppModel.updateApp(id, { "name": name });
      return success;
    } catch (error) {
      console.log('AppService updateName error: ', error);
      return false;
    }
  }

  /**
   * Update the app's description.
   * @param {string} id The app's unique id.
   * @param {string} description The new description.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateDescription(id: string, description: string): Promise<boolean> {
    try {
      const success = await AppModel.updateApp(id, { "description": description });
      return success;
    } catch (error) {
      console.log('AppService updateDescription error: ', error);
      return false;
    }
  }


  /**
   * Update the app's ownerId. This is transferring ownership to a new user.
   * @param {string} id The app's unique id.
   * @param {string} ownerId The id of the new owner.
   * @return {Promise<boolean>} Returns true if action was succesful.
   */
  public async updateOwnerId(id: string, ownerId: string): Promise<boolean> {
    try {
      const success = await AppModel.updateApp(id, { "ownerId": ownerId });
      return success;
    } catch (error) {
      console.log('AppService updateOwnerId error: ', error);
      return false;
    }
  }

  /**
 * Update the app's roomId. This is transferring ownership to a new room.
 * @param {string} id The app's unique id.
 * @param {string} roomId The id of the new room.
 * @return {Promise<boolean>} Returns true if action was succesful.
 */
  public async updateRoomId(id: string, roomId: string): Promise<boolean> {
    try {
      const success = await AppModel.updateApp(id, { "roomId": roomId });
      return success;
    } catch (error) {
      console.log('AppService updateRoomId error: ', error);
      return false;
    }
  }

  /**
* Update the app's boardId. This is transferring ownership to a new board.
* @param {string} id The app's unique id.
* @param {string} roomId The id of the new room.
* @return {Promise<boolean>} Returns true if action was succesful.
*/
  public async updateBoardId(id: string, boardId: string): Promise<boolean> {
    try {
      const success = await AppModel.updateApp(id, { "boardId": boardId });
      return success;
    } catch (error) {
      console.log('AppService updateBoardId error: ', error);
      return false;
    }
  }

  /**
* Update the app's boardId. This is transferring ownership to a new board.
* @param {string} id The app's unique id.
* @param {string} roomId The id of the new room.
* @return {Promise<boolean>} Returns true if action was succesful.
*/
  public async updateState(id: string, state: Partial<AppStates>): Promise<boolean> {
    try {
      const success = await AppModel.updateState(id, state);
      return success;
    } catch (error) {
      console.log('AppService updateBoardId error: ', error);
      return false;
    }
  }

  /**
 * Delete a app in the database.
 * @param {string} id The id of the app.
 * @returns {boolean} Returns true if delete was successful
 */
  public async deleteApp(id: string): Promise<boolean> {
    try {
      const success = await AppModel.deleteApp(id);
      return success;
    } catch (error) {
      console.log('AppService deleteApp error> ', error);
      return false;
    }
  }

  /**
  * Subscribe to a app in the database.
  * @param {string} id The id of the app
  * @returns {(() => Promise<void>) | undefined} Callback function to unsubscribe
  */
  public async subscribeToApp(id: string, callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await AppModel.subscribeToApp(id, callback);
      return subscription;
    } catch (error) {
      console.log('AppService subscribeToApp error> ', error);
      return undefined;
    }
  }

  /**
  * Subscribe to all apps in the database.
  * @returns {(() => Promise<void>) | undefined} Callback function to unsubscribe
  */
  public async subscribetoAllApps(callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await AppModel.subscribeToApps(callback);
      return subscription;
    } catch (error) {
      console.log('AppService subscribetoAllApps error> ', error);
      return undefined;
    }
  }

  /**
* Subscribe to all apps in a specific room.
* @returns {(() => Promise<void>) | undefined} Callback function to unsubscribe
*/
  public async subscribeByRoomId(roomId: string, callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await AppModel.subscribeByRoomId(roomId, callback);
      return subscription;
    } catch (error) {
      console.log('AppService subscribeByRoomId error> ', error);
      return undefined;
    }
  }

  /**
* Subscribe to all apps in a specific board.
* @returns {(() => Promise<void>) | undefined} Callback function to unsubscribe
*/
  public async subscribeByBoardId(roomId: string, callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await AppModel.subscribeByBoardId(roomId, callback);
      return subscription;
    } catch (error) {
      console.log('AppService subscribeByBoardId error> ', error);
      return undefined;
    }
  }

}


export const AppService = new SAGE3AppService();