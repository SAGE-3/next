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
import { UserRole, UserSchema } from '@sage3/shared/types';
import { SBAuthSchema, SBDocumentMessage } from '@sage3/sagebase';
import { randomSAGEColor } from '@sage3/shared';
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
    const reponse = user ? true : false;
    return reponse;
  }

  /**
   * Create a new user in the database.
   * @param {string} id The unique id of the user. This is a foriegn key of the AuthModel primary key.
   * @param {string} name The name of the user.
   * @param {string} email The email address of the user.
   * @returns {SBDocument<UserSchema> | undefined} Returns the UserDoc or undefined if unsuccessful
   */
  public async create(auth: SBAuthSchema, user: Partial<UserSchema>): Promise<UserSchema | undefined> {
    const role = auth.provider === 'guest' ? ('guest' as UserRole) : ('user' as UserRole);
    const newUser = {
      id: auth.id,
      ...user,
      color: randomSAGEColor().name,
      emailVerified: false,
      profilePicture: '',
      userType: 'client',
      userRole: role,
    } as UserSchema;

    try {
      const doc = await UserModel.createUser(auth.id, newUser);
      return doc ? doc.data : undefined;
    } catch (error) {
      console.log('UserService create error: ', error);
      return undefined;
    }
  }

  /**
   * Read a user.
   * @param {string} id The user's unique id.
   * @return {SBDocument<UserSchema> | undefined} Returns the user schema if read successful.
   */
  public async read(id: string): Promise<UserSchema | undefined> {
    try {
      const doc = await UserModel.readUser(id);
      return doc ? doc.data : undefined;
    } catch (error) {
      console.log('UserService read error: ', error);
      return undefined;
    }
  }

  /**
   * Read all users.
   * @return {UserSchema[] | undefined} Returns an array of users if the read was sucessful.
   */
  public async readAll(): Promise<UserSchema[] | undefined> {
    try {
      const docArray = await UserModel.readAllUsers();
      const docs = docArray.map((doc) => doc.data) as UserSchema[];
      return docs ? docs : undefined;
    } catch (error) {
      console.log('UserService readAll error: ', error);
      return undefined;
    }
  }

  /**
   * Update the user.
   * @param {string} id The user's unique id.
   * @param {Partial<UserSchema>} update The new name.
   * @return {Promise<boolean>} Returns true if update was successful.
   */
  public async update(id: string, update: Partial<UserSchema>): Promise<boolean> {
    try {
      const success = await UserModel.updateUser(id, update);
      return success;
    } catch (error) {
      console.log('UserService update error: ', error);
      return false;
    }
  }

  /**
   * Delete a user in the database.
   * @param {string} id The id of the user
   * @returns {boolean} Returns true if delete was successful
   */
  public async delete(id: string): Promise<boolean> {
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
  public async subscribe(id: string, callback: (message: SBDocumentMessage<UserSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await UserModel.subscribe(id, callback);
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
  public async subscribeAll(callback: (message: SBDocumentMessage<UserSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const subscription = await UserModel.subscribeAll(callback);
      return subscription;
    } catch (error) {
      console.log('UserService subscribeToAllUsers error> ', error);
      return undefined;
    }
  }
}

export const UserService = new SAGE3UserService();
