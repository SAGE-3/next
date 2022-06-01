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

import { AppSchema, AppStates } from '@sage3/applications/types';
/**
 * The database model for SAGE3 Apps.
 */
class SAGE3AppModel {
  private appCollection!: SBCollectionRef<AppSchema>;
  private collectionName = "APPS";

  /**
   * Contructor initializing the BoardModel.
   */
  public async initialize(): Promise<void> {
    const indexObj = {
      name: '',
      ownerId: '',
      roomId: '',
      boardId: ''
    } as AppSchema;
    this.appCollection = await SAGEBase.Database.collection<AppSchema>(this.collectionName, indexObj);
  }

  /**
   * Create a new app in the database.
   * @param {string} id The boards's unique id.
   * @param {BoardSchema} newBoard The new board to add to the database
   * @returns {Promise<boolean>} Returns true if board was succesfully created.
   */
  public async createApp(id: string, newRoom: AppSchema): Promise<SBDocument<AppSchema> | undefined> {
    try {
      const docRef = await this.appCollection.addDoc(newRoom, id);
      if (docRef) {
        const doc = await docRef.read();
        return doc;
      } else {
        return undefined;
      }
    } catch (error) {
      console.log('AppModel createApp error> ', error);
      return undefined;
    }
  }

  /**
   * Get app by their unique id.
   * @param {string} id The app's unique id.
   * @returns {AppSchema | undefined} A AppSchema of the app. Return undefined if no such app.
   */
  public async readApp(id: string): Promise<SBDocument<AppSchema> | undefined> {
    try {
      const board = await this.appCollection.docRef(id).read();
      return board;
    } catch (error) {
      console.log('AppModel readApp error> ', error);
      return undefined;
    }
  }


  /**
  * Returns all apps for this SAGE3 server.
  * @returns {Array<SBDocument<AppSchema>>} AppSchema array of all boards
  */
  public async readAllApps(): Promise<SBDocument<AppSchema>[]> {
    try {
      const users = await this.appCollection.getAllDocs();
      return users;
    } catch (error) {
      console.log('AppModel readAllApps error> ')
      return [];
    }
  }

  /**
 * Query Apps
 * @param {string} field Field to query on AppSchema
 * @param {string | number} query The Query
  * @returns {Array<SBDocument<AppSchema>>} AppSchema array of all apps
 */
  public async queryApps(field: keyof AppSchema, query: Partial<AppSchema>): Promise<SBDocument<AppSchema>[] | undefined> {
    try {
      const q = query[field];
      if (typeof q !== 'string' || typeof q !== typeof 'number') return undefined;
      const boards = await this.appCollection.query(field, q);
      return boards;
    } catch (error) {
      console.log('AppModel queryApps error> ', error);
      return undefined;
    }
  }


  /**
   * Update the app doc in the database.
   * @param {string} id The app's unique id.
   * @param {SBDocumentUpdate<AppSchema>} update The update values for the doc.
   * @return {Promise<boolean>} Returns true if update was succesful.
   */
  public async updateApp(id: string, update: SBDocumentUpdate<AppSchema>): Promise<boolean> {
    try {
      const response = await this.appCollection.docRef(id).update(update);
      return response.success;
    } catch (error) {
      console.log('BoardModel updateBoard error: ', error);
      return false;
    }
  }

  /**
 * Update the app doc in the database.
 * @param {string} id The app's unique id.
 * @param {Partial<AppStates>} update The update values for the state.
 * @return {Promise<boolean>} Returns true if update was succesful.
 */
  public async updateState(id: string, update: Partial<AppStates>): Promise<boolean> {
    try {
      const currentState = await this.appCollection.docRef(id).read();
      if (!currentState) return false;
      const updatedState = { ...currentState.data.state, ...update }
      const response = await this.appCollection.docRef(id).update({ 'state': updatedState });
      return response.success;
    } catch (error) {
      console.log('BoardModel updateBoard error: ', error);
      return false;
    }
  }

  /**
   * Delete a app in the database.
   * @param {string} id The id of the app
   * @returns {boolean} Returns true if deletion was successful
   */
  public async deleteApp(id: string): Promise<boolean> {
    try {
      const response = await this.appCollection.docRef(id).delete();
      return response.success;
    } catch (error) {
      console.log('AppModel deleteApp error> ', error);
      return false;
    }
  }


  /**
 * Subscribe to a specific app
 * @param {string} id the id of the app
 * @param {() = void} callback The callback function for subscription events.
 * @return {() => void | undefined} The unsubscribe function.
 
 */
  public async subscribeToApp(id: string, callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const board = this.appCollection.docRef(id);
      const unsubscribe = await board.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('AppModel subscribeToBoard error>', error)
      return undefined;
    }
  }

  /**
 * Subscribe to the Apps Collection
 * @param {() = void} callback The callback function for subscription events.
 * @return {() => void | undefined} The unsubscribe function.
 */
  public async subscribeToApps(callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this.appCollection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('AppModel subscribeToApps error>', error)
      return undefined;
    }
  }

  /**
 * Subscribe to a room's apps
 * @param {string} id the id of the room
 * @param {() = void} callback The callback function for subscription events.
 * @return {() => void | undefined} The unsubscribe function.
 */
  public async subscribeByRoomId(id: string, callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = this.appCollection.subscribeToQuery('roomId', id, callback);
      return unsubscribe;
    } catch (error) {
      console.log('AppModel subscribeByRoomId error>', error)
      return undefined;
    }
  }

  /**
* Subscribe to a board's apps
* @param {string} id the id of the board
* @param {() = void} callback The callback function for subscription events.
* @return {() => void | undefined} The unsubscribe function.
*/
  public async subscribeByBoardId(id: string, callback: (message: SBDocumentMessage<AppSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = this.appCollection.subscribeToQuery('boardId', id, callback);
      return unsubscribe;
    } catch (error) {
      console.log('AppModel subscribeByBoardId error>', error)
      return undefined;
    }
  }

}

export const AppModel = new SAGE3AppModel();


