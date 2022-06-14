/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The Room database model.
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
import { RoomSchema } from '@sage3/shared/types';

/**
 * The database model for SAGE3 rooms.
 * This class must be initilized at least once.
 * This is handled in ./loaders/models-loader.ts
 */
class SAGE3RoomModel {
  private roomCollection!: SBCollectionRef<RoomSchema>;
  private collectionName = 'ROOMS';

  /**
   * Contructor initializing the RoomModle.
   */
  public async initialize(): Promise<void> {
    const indexObj = {
      name: '',
      ownerId: '',
    } as RoomSchema;
    this.roomCollection = await SAGEBase.Database.collection<RoomSchema>(this.collectionName, indexObj);
  }

  /**
   * Create a new room in the database.
   * @param {string} id The room's unique id.
   * @param {RoomSchema} newRoom The new room to add to the database
   * @returns {Promise<boolean>} Returns true if room was succesfully created.
   */
  public async createRoom(id: string, newRoom: RoomSchema): Promise<SBDocument<RoomSchema> | undefined> {
    try {
      const docRef = await this.roomCollection.addDoc(newRoom, id);
      if (docRef) {
        const doc = await docRef.read();
        return doc;
      } else {
        return undefined;
      }
    } catch (error) {
      console.log('RoomModel createRoom error: ', error);
      return undefined;
    }
  }

  /**
   * Get room by their unique id.
   * @param {string} id The room's unique id.
   * @returns {RoomSchema | undefined} A RoomSchema of the room. Return undefined if no such room.
   */
  public async readRoom(id: string): Promise<SBDocument<RoomSchema> | undefined> {
    try {
      const room = await this.roomCollection.docRef(id).read();
      return room;
    } catch (error) {
      console.log('RoomModel readRoom error: ', error);
      return undefined;
    }
  }

  /**
   * Returns all rooms for this SAGE3 server.
   * @returns {Array<RoomSchema>} UserSchema array of all users
   */
  public async readAllRooms(): Promise<SBDocument<RoomSchema>[]> {
    try {
      const users = await this.roomCollection.getAllDocs();
      return users;
    } catch (error) {
      console.log('RoomModel readAllRooms error>');
      return [];
    }
  }

  /**
   * Query rooms
   * @param {string} id The roomId.
   * @returns {Array<SBDocument<RoomSchema>>} RoomSchema array of all rooms that satisfy the query
   */
  public async queryRooms(field: keyof RoomSchema, query: Partial<RoomSchema>): Promise<SBDocument<RoomSchema>[] | undefined> {
    try {
      const q = query[field];
      if (typeof q !== 'string' || typeof q !== typeof 'number') return undefined;
      const boards = await this.roomCollection.query(field, q);
      return boards;
    } catch (error) {
      console.log('BoardModel readBoard error> ', error);
      return undefined;
    }
  }

  /**
   *  Update the room doc in the database.
   * @param {string} id The room's unique id.
   * @param {SBDocumentUpdate<RoomSchema>} update The update values for the doc.
   * @return {Promise<boolean>} Returns true if update was succesful.
   */
  public async updateRoom(id: string, update: SBDocumentUpdate<RoomSchema>): Promise<boolean> {
    try {
      const response = await this.roomCollection.docRef(id).update(update);
      return response.success;
    } catch (error) {
      console.log('RoomModel updateRoom error: ', error);
      return false;
    }
  }

  /**
   * Delete a room in the database.
   * @param {string} id The id of the room
   * @returns {boolean} Returns true if deletion was successful
   */
  public async deleteRoom(id: string): Promise<boolean> {
    try {
      const response = await this.roomCollection.docRef(id).delete();
      return response.success;
    } catch (error) {
      console.log('RoomModel deleteRoom error> ', error);
      return false;
    }
  }

  /**
   * Subscribe to the Room Collection
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeAll(callback: (message: SBDocumentMessage<RoomSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this.roomCollection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('RoomModel subscribeToRooms error>', error);
      return undefined;
    }
  }

  /**
   * Subscribe to a specific room
   * @param {string} id the id of the room
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.

   */
  public async subscribe(
    id: string,
    callback: (message: SBDocumentMessage<RoomSchema>) => void
  ): Promise<(() => Promise<void>) | undefined> {
    try {
      const room = this.roomCollection.docRef(id);
      const unsubscribe = await room.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('RoomModel subscribeToRoom error>', error);
      return undefined;
    }
  }
}

export const RoomModel = new SAGE3RoomModel();
