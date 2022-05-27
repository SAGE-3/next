/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The UserService for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { UserModel } from '../models';
import { UserRole, UserSchema, UserType } from '@sage3/shared/types';
import { SBDocumentMessage } from '@sage3/sagebase';
import { randomSAGEColor, SAGEColors } from '@sage3/shared';
/**
 * The SAGE3 UserService that interfaces with the UserModel
 */
class SAGE3UserService {

  /**
   * Check if user exists in the database
   * @returns {boolean} true if the user exists in the database, false otherwise.
   */
  public async userCheck(id: string): Promise<boolean> {
    const user = await UserModel.readUser(id);
    const reponse = (user) ? true : false;
    return reponse;
  }

  /**
   * Create a new user in the database.
   * @param {string} id The unique id of the user. This is a foriegn key of the AuthModel primary key.
   * @param {string} name The name of the user.
   * @param {string} email The email address of the user.
   * @returns {SBDocument<UserSchema> | undefined} Returns the UserDoc or undefined if unsuccessful
   */
  public async createUser(id: string, name: string, email: string, role: string): Promise<UserSchema | undefined> {
    const newUser = {
      id: id,
      name: name,
      email: email,
      color: randomSAGEColor().name,
      emailVerified: false,
      profilePicture: '',
      userType: 'client',
      userRole: role
    } as UserSchema;

    try {
      const doc = await UserModel.createUser(id, newUser);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('UserService createUser error: ', error);
      return undefined;
    }
  }

  /**
   * Read a user.
   * @param {string} id The user's unique id.
   * @return {SBDocument<UserSchema> | undefined} Returns the user schema if read successful.
   */
  public async readUser(id: string): Promise<UserSchema | undefined> {
    try {
      const doc = await UserModel.readUser(id);
      return (doc) ? doc.data : undefined;
    } catch (error) {
      console.log('UserService readUser error: ', error);
      return undefined;
    }
  }

  /**
 * Read all users.
 * @return {UserSchema[] | undefined} Returns an array of users if the read was sucessful.
 */
  public async readAllUsers(): Promise<UserSchema[] | undefined> {
    try {
      const docArray = await UserModel.readAllUsers();
      const docs = docArray.map(doc => doc.data) as UserSchema[];
      return (docs) ? docs : undefined;
    } catch (error) {
      console.log('UserService readAllUsers error: ', error);
      return undefined;
    }
  }

  /**
   * Update the user's name.
   * @param {string} id The user's unique id.
   * @param {string} name The new name.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateName(id: string, name: string): Promise<boolean> {
    try {
      const success = await UserModel.updateUser(id, { "name": name });
      return success;
    } catch (error) {
      console.log('UserService updateName error: ', error);
      return false;
    }
  }

  /**
   * Update the user's email.
   * @param {string} id The user's unique id.
   * @param {string} email The new email.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateEmail(id: string, email: string): Promise<boolean> {
    try {
      const success = await UserModel.updateUser(id, { "email": email });
      return success;
    } catch (error) {
      console.log('UserService updateEmail error: ', error);
      return false;
    }
  }

  /**
   * Update the user's color.
   * @param {string} id The user's unique id.
   * @param {string} color The new color.
   * @return {Promise<boolean>} Returns true if update was succesful.
   */
  public async updateColor(id: string, color: string): Promise<boolean> {
    try {
      // Check to see if new color name is an actual sage color
      const found = SAGEColors.some(el => el.name === color);
      if (!found) return false;
      const success = await UserModel.updateUser(id, { "color": color });
      return success;
    } catch (error) {
      console.log('UserService updateColor error: ', error);
      return false;
    }
  }

  /**
   * Update the user's profile picture.
   * @param {string} id The user's unique id.
   * @param {string} profilePicture The url of the new picture
   * @return {Promise<boolean>} Returns true if update was succesful.
   */
  public async updateProfilePicture(id: string, profilePicture: string): Promise<boolean> {
    try {
      const success = await UserModel.updateUser(id, { "profilePicture": profilePicture });
      return success;
    } catch (error) {
      console.log('UserService updateProfilePicture error: ', error);
      return false;
    }
  }

  /**
   * Update the user's type.
   * @param {string} id The user's unique id.
   * @param {UserType} color The new type.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateUserType(id: string, userType: UserType): Promise<boolean> {
    try {
      const success = await UserModel.updateUser(id, { "userType": userType });
      return success;
    } catch (error) {
      console.log('UserService updateUserType error: ', error);
      return false;
    }
  }

  /**
   * Update the user's role.
   * @param {string} id The user's unique id.
   * @param {UserRole} color The new role.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async updateUserRole(id: string, userRole: UserRole): Promise<boolean> {
    try {
      const success = await UserModel.updateUser(id, { "userRole": userRole });
      return success;
    } catch (error) {
      console.log('UserService updateUserRole error: ', error);
      return false;
    }
  }

  /**
 * Delete a user in the database.
 * @param {string} id The id of the user
 * @returns {boolean} Returns true if delete was successful
 */
  public async deleteUser(id: string): Promise<boolean> {
    try {
      const success = await UserModel.deleteUser(id);
      return success;
    } catch (error) {
      console.log('UserService deleteUser error> ', error);
      return false;
    }
  }

  /**
* Subscribe to a user in the database.
* @param {string} id The id of the user
* @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
*/
  public async subscribeToUser(id: string, callback: (message: SBDocumentMessage<UserSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await UserModel.subscribeToUser(id, callback);
      return subscription;
    } catch (error) {
      console.log('UserService subscribeToUser error> ', error);
      return undefined;
    }
  }

  /**
  * Subscribe to all users in the database.
  * @returns {(() => Promise<void>) | undefined} Returns true if delete was successful
  */
  public async subscribeToAllUsers(callback: (message: SBDocumentMessage<UserSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await UserModel.subscribeToUsers(callback);
      return subscription;
    } catch (error) {
      console.log('UserService subscribeToAllUsers error> ', error);
      return undefined;
    }
  }
}


export const UserService = new SAGE3UserService();