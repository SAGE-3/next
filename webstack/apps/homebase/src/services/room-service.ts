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
import { randomSAGEColor, SAGEColors, genId } from '@sage3/shared';
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
  public async createRoom(name: string, description: string, ownerId: string): Promise<RoomSchema | undefined> {
    const id = genId();
    const newRoom = {
      id: id,
      name: name,
      description: description,
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
  public async readRoom(id: string): Promise<RoomSchema | undefined> {
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
  public async readAllRooms(): Promise<RoomSchema[] | undefined> {
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
  public async updateName(id: string, name: string): Promise<boolean> {
    try {
      const success = await RoomModel.updateRoom(id, { "name": name });
      return success;
    } catch (error) {
      console.log('RoomService updateName error: ', error);
      return false;
    }
  }

  /**
   * Update the room's description.
   * @param {string} id The room's unique id.
   * @param {string} description The new description.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateDescription(id: string, description: string): Promise<boolean> {
    try {
      const success = await RoomModel.updateRoom(id, { "description": description });
      return success;
    } catch (error) {
      console.log('RoomService updateDescription error: ', error);
      return false;
    }
  }

  /**
   * Update the room's color.
   * @param {string} id The room's unique id.
   * @param {string} color The new color.
   * @return {Promise<boolean>} Returns true if action was succesful.
   */
  public async updateColor(id: string, color: string): Promise<boolean> {
    try {
      // Check to see if new color name is an actual sage color
      const found = SAGEColors.some(el => el.name === color);
      if (!found) return false;
      const success = await RoomModel.updateRoom(id, { "color": color });
      return success;
    } catch (error) {
      console.log('RoomService updateColor error: ', error);
      return false;
    }
  }

  /**
   * Update the room's ownerId. This is transferring ownership to a new user.
   * @param {string} id The room's unique id.
   * @param {string} ownerId The id of the new owner.
   * @return {Promise<boolean>} Returns true if action was succesful.
   */
  public async updateOwnerId(id: string, ownerId: string): Promise<boolean> {
    try {
      const success = await RoomModel.updateRoom(id, { "ownerId": ownerId });
      return success;
    } catch (error) {
      console.log('RoomService updateOwnerId error: ', error);
      return false;
    }
  }

  /**
   * Update the room's private state.
   * @param {string} id The room's unique id.
   * @param {boolean} isPrivate The new type.
   * @return {Promise<boolean>} Returns true if action was successful.
   */
  public async updateIsPrivate(id: string, isPrivate: boolean): Promise<boolean> {
    try {
      const success = await RoomModel.updateRoom(id, { "isPrivate": isPrivate });
      return success;
    } catch (error) {
      console.log('RoomService updateIsPrivate error: ', error);
      return false;
    }
  }

  /**
 * Delete a room in the database.
 * @param {string} id The id of the room.
 * @returns {boolean} Returns true if delete was successful
 */
  public async deleteRoom(id: string): Promise<boolean> {
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