/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The User database model.
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
import { UserSchema } from '@sage3/shared/types';

/**
 * The database model for SAGE3 users.
 */
class SAGE3UserModel {
  private userCollection!: SBCollectionRef<UserSchema>;
  private collectionName = "USERS";

  /**
   * Contructor initializing the UserModel.
   */
  public async initialize(): Promise<void> {
    const indexObj = {
      name: '',
      email: ''
    } as UserSchema;
    this.userCollection = await SAGEBase.Database.collection<UserSchema>(this.collectionName, indexObj);
  }

  /**
   * Create a new user in the database.
   * @param {UserSchema} newUser The newuser to add to the database
   * @returns {Promise<boolean>} Returns true if user was succesfully created.
   */
  public async createUser(id: string, newUser: UserSchema): Promise<SBDocument<UserSchema> | undefined> {
    try {
      const docRef = await this.userCollection.addDoc(newUser, id);
      if (docRef) {
        const doc = await docRef.read();
        return doc;
      } else {
        return undefined;
      }
    } catch (error) {
      console.log('UserModel createUser error: ', error);
      return undefined;
    }
  }

  /**
   * Get user by their unique id.
   * @param {string} id The user's unique id.
   * @returns {UserSchema | undefined} A UserSchema of the user. Return undefined if no such user.
   */
  public async readUser(id: string): Promise<SBDocument<UserSchema> | undefined> {
    try {
      const user = await this.userCollection.docRef(id).read();
      return user;
    } catch (error) {
      console.log('UserModel readUser error: ', error);
      return undefined;
    }
  }

  /**
  * Returns all users for this SAGE3 server.
  * @returns {Array<UserSchema>} UserSchema array of all users
  */
  public async readAllUsers(): Promise<SBDocument<UserSchema>[]> {
    try {
      const users = await this.userCollection.getAllDocs();
      return users;
    } catch (error) {
      console.log('UserModel readAllUsers error>')
      return [];
    }
  }

  /**
   *  Update the user doc in the database.
   * @param {string} id The user's unique id.
   * @param {SBDocumentUpdate<UserSchema>} update The update value for the doc.
   * @return {Promise<boolean>} Returns true if update was succesful.
   */
  public async updateUser(id: string, update: SBDocumentUpdate<UserSchema>): Promise<boolean> {
    try {
      const response = await this.userCollection.docRef(id).update(update);
      return response.success;
    } catch (error) {
      console.log('UserModel updateUser error: ', error);
      return false;
    }
  }

  /**
   * Delete a user in the database.
   * @param {string} id The id of the user
   * @returns {boolean} Returns true if deletion was successful
   */
  public async deleteUser(id: string): Promise<boolean> {
    try {
      const response = await this.userCollection.docRef(id).delete();
      return response.success;
    } catch (error) {
      console.log('UserModel deleteUser error> ', error);
      return false;
    }
  }

  /**
   * Subscribe to the User Collection
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeToUsers(callback: (message: SBDocumentMessage<UserSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this.userCollection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('UserModel subscribeToUsers error>', error)
      return undefined;
    }
  }

  /**
   * Subscribe to a specific user
   * @param {string} id the id of the user
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeToUser(id: string, callback: (message: SBDocumentMessage<UserSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const user = this.userCollection.docRef(id);
      const unsubscribe = await user.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('UserModel subscribeToUser error>', error)
      return undefined;
    }
  }
}

export const UserModel = new SAGE3UserModel();