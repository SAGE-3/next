/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Router } from 'express';
import { WebSocket } from 'ws';

import { SAGEBase, SBCollectionRef, SBDocumentMessage, SBDocument, SBJSON, SBDocumentUpdate, SBAuthSchema } from '@sage3/sagebase';
import { APIClientWSMessage } from '@sage3/shared/types';

import { SubscriptionCache } from '../utils';
import { sageWSRouter } from './SAGEWSRouter';

///////////////////////////////////////////////////////////////////////////////
// SAGE3 Collection collection
///////////////////////////////////////////////////////////////////////////////

export class SAGE3Collection<T extends SBJSON> {
  private _collection!: SBCollectionRef<T>;
  private _name: string;
  private _queryableAttributes: Partial<T>;

  private _httpRouter!: Router;

  constructor(name: string, queryableAttributes: Partial<T>) {
    this._name = name;
    this._queryableAttributes = queryableAttributes;
  }

  protected get collection(): SBCollectionRef<T> {
    return this._collection;
  }

  public get name(): string {
    return this._name;
  }

  /**
   * Initialize the collection
   * @param clear Clear the whole collection before initializing
   */
  public async initialize(clear?: boolean, ttl?: number): Promise<void> {
    this._collection = await SAGEBase.Database.collection<T>(this.name, this._queryableAttributes, ttl);
    // Clear the collection at initialization
    if (clear) {
      this.deleteAll();
    }
  }

  /**
   * Add a single item to the collection
   * @param item The item to add
   * @param by Who added the item
   * @param id Force an id for the item
   * @returns The added item if succesfull. Otherwise underfined
   */
  public async add(item: T, by: string, id?: string): Promise<SBDocument<T> | undefined> {
    try {
      const docRef = await this._collection.addDoc(item, by, id);
      if (docRef) {
        const doc = await docRef.read();
        return doc;
      } else {
        return undefined;
      }
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  /**
   * Add a batch of items to the collection
   * This will partially add if some are 'adds' are not successful
   * @param item Item to add
   * @param by The id of the user adding the item
   * @returns An array of the succcesully added items
   */
  public async addBatch(item: T[], by: string): Promise<SBDocument<T>[] | undefined> {
    try {
      // Create promise for each item
      const promises = item.map((i) => this._collection.addDoc(i, by));
      // Wait for all promises to resolve
      const docRefs = await Promise.all(promises);
      // Read all documents
      const docs = await Promise.all(docRefs.map((ref) => ref?.read()));
      // Remove undefined values
      const filteredDocs = docs.filter((doc) => doc !== undefined) as SBDocument<T>[];
      // Return docs
      return filteredDocs;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  /**
   * Get an item by id from the collection
   * @param id The id of the item to get
   * @returns The item if successful. Otherwise undefined
   */
  public async get(id: string): Promise<SBDocument<T> | undefined> {
    try {
      const doc = await this._collection.docRef(id).read();
      return doc;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  /**
   * Get all documents from the collection
   * @returns All documents if successful. Otherwise undefined
   */
  public async getAll(): Promise<SBDocument<T>[] | undefined> {
    try {
      const docs = await this._collection.getAllDocs();
      return docs;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  /**
   * Query the collection for a specific value
   * @param field The property field to query
   * @param query The value to query
   * @returns The documents that match the query if successful. Otherwise undefined
   */
  public async query(field: keyof T, query: string | number): Promise<SBDocument<T>[] | undefined> {
    try {
      const docs = await this._collection.query(field, query);
      return docs;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  /**
   * Update a document in the collection
   * @param id The id of the document to update
   * @param by Who is updating the document
   * @param update The update to apply
   * @returns True if successful. Otherwise false
   */
  public async update(id: string, by: string, update: SBDocumentUpdate<T>): Promise<boolean> {
    try {
      const response = await this._collection.docRef(id).update(update, by);
      return response.success;
    } catch (error) {
      this.printError(error);
      return false;
    }
  }

  public async updateBatch(updates: { id: string; update: SBDocumentUpdate<T> }[], by: string): Promise<boolean[] | boolean> {
    try {
      // Create a promise for each update
      const promises = updates.map((u) => this._collection.docRef(u.id).update(u.update, by));
      // Wait for all promises to resolve
      const responses = await Promise.all(promises);
      // Check if all responses are successful
      const success = responses.map((r) => r.success);
      return success;
    } catch (error) {
      this.printError(error);
      return false;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const response = await this._collection.docRef(id).delete();
      return response.success;
    } catch (error) {
      this.printError(error);
      return false;
    }
  }

  public async deleteBatch(id: string[]): Promise<boolean[] | boolean> {
    try {
      // Create a promise for each delete
      const promises = id.map((i) => this._collection.docRef(i).delete());
      // Wait for all promises to resolve
      const responses = await Promise.all(promises);
      // Check if all responses are successful
      const success = responses.map((r) => r.success);
      return success;
    } catch (error) {
      this.printError(error);
      return false;
    }
  }

  public async deleteAll(): Promise<void> {
    const refs = await this._collection.getAllDocRefs();
    for (const ref of refs) {
      await ref.delete();
    }
  }

  public async subscribe(id: string, callback: (message: SBDocumentMessage<T>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const app = this._collection.docRef(id);
      const unsubscribe = await app.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async subscribeAll(callback: (message: SBDocumentMessage<T>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this._collection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async subscribeByQuery(
    field: keyof T,
    value: string,
    callback: (message: SBDocumentMessage<T>) => void
  ): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this._collection.subscribeToQuery(field, value, callback);
      return unsubscribe;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  protected set httpRouter(router: Router) {
    this._httpRouter = router;
  }

  public router(): Router {
    return this._httpRouter;
  }

  public wsRouter(socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache): Promise<void> {
    return sageWSRouter<T>(this, socket, message, user, cache);
  }

  protected printMessage(message: string) {
    console.log(`SAGE3Collection ${this.name}> ${message}`);
  }

  protected printError(message: string) {
    console.error(`SAGE3Collection ${this.name}> ${message}`);
  }

  protected printWarn(message: string) {
    console.warn(`SAGE3Collection ${this.name}> ${message}`);
  }
}
