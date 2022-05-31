/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The RoomService for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { RoomModel } from '../models';
import { RoomSchema } from '@sage3/shared/types';
import { SBDocumentMessage } from '@sage3/sagebase';
import { genId, randomSAGEColor } from '@sage3/shared';
/**
 * The SAGE3 RoomService that interfaces with the UserModel
 */
class SAGE3RoomService {

  /**
   * Check if a room exists in the database
   * @returns {boolean} true if the user exists in the database, false otherwise.
   */
  public async roomCheck(id: string): Promise<boolean> {
    const room = await RoomModel.readRoom(id);
    const reponse = (room) ? true : false;
    return reponse;
  }

  /**
   * Create a new room in the database.
   * @param {string} name The name of the board.
   * @param {string} description The description of the board.
   * @param {string} ownerId The id of the user who created the board.
   * @returns {SBDocument<UserSchema> | undefined} Returns the UserDoc or undefined if unsuccessful
   */
  public async create(name: string, description: string, ownerId: string): Promise<RoomSchema | undefined> {
    const id = genId();
    const newRoom = {
      id,
      name,
      description,
      color: randomSAGEColor().name,
      ownerId: ownerId,
      isPrivate: false
    } as RoomSchema;

    try {
      const doc = await RoomModel.createRoom(id, newRoom);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('RoomService createRoom error: ', error);
      return undefined;
    }
  }

  /**
   * Read a room.
   * @param {string} id The room's unique id.
   * @return {RoomSchema| undefined} Returns the room if the read was sucessful.
   */
  public async read(id: string): Promise<RoomSchema | undefined> {
    try {
      const doc = await RoomModel.readRoom(id);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('RoomService readUser error: ', error);
      return undefined;
    }
  }


  /**
   * Read all rooms.
   * @return {RoomSchema[] | undefined} Returns an array of rooms if the read was sucessful.
   */
  public async readAll(): Promise<RoomSchema[] | undefined> {
    try {
      const docArray = await RoomModel.readAllRooms();
      const docs = docArray.map(doc => doc.data) as RoomSchema[];
      return (docs) ? docs : undefined;
    } catch (error) {
      console.log('RoomService readAllRooms error: ', error);
      return undefined;
    }
  }

  /**
   * Update the room's name.
   * @param {string} id The room's unique id.
   * @param {string} name The new name.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async update(id: string, update: Partial<RoomSchema>): Promise<boolean> {
    try {
      const success = await RoomModel.updateRoom(id, update);
      return success;
    } catch (error) {
      console.log('RoomService updateName error: ', error);
      return false;
    }
  }

  /**
 * Delete a room in the database.
 * @param {string} id The id of the room.
 * @returns {boolean} Returns true if delete was successful
 */
  public async delete(id: string): Promise<boolean> {
    try {
      const success = await RoomModel.deleteRoom(id);
      return success;
    } catch (error) {
      console.log('RoomService deleteRoom error> ', error);
      return false;
    }
  }

  /**
  * Subscribe to a room in the database.
  * @param {string} id The id of the user
  * @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
  */
  public async subscribeToRoom(id: string, callback: (message: SBDocumentMessage<RoomSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await RoomModel.subscribeToRoom(id, callback);
      return subscription;
    } catch (error) {
      console.log('RoomService subscribeToRoom error> ', error);
      return undefined;
    }
  }

  /**
  * Subscribe to all rooms in the database.
  * @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
  */
  public async subscribeToAllRooms(callback: (message: SBDocumentMessage<RoomSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await RoomModel.subscribeToRooms(callback);
      return subscription;
    } catch (error) {
      console.log('RoomService subscribeToAllRooms error> ', error);
      return undefined;
    }
  }

}


export const RoomService = new SAGE3RoomService();