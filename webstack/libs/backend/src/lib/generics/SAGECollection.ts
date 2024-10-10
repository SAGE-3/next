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
  public async addBatch(items: T[], by: string): Promise<SBDocument<T>[] | undefined> {
    try {
      // Add a batch of items to the collection
      // This will partially add if some are 'adds' are not successful
      const docs = await this.collection.addDocs(items, by);
      // Return docs
      return docs;
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
   * Get mulitple docs by id from the collection
   * @param ids The ids of the items to get
   * @returns The items if successful. Otherwise undefined
   */
  public async getBatch(ids: string[]): Promise<SBDocument<T>[] | undefined> {
    try {
      const docs = await Promise.all(ids.map((id) => this._collection.docRef(id).read()));
      return docs.filter((doc) => doc !== undefined) as SBDocument<T>[];
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
  public async query(field: keyof T | keyof SBDocument<T>, query: string | number): Promise<SBDocument<T>[] | undefined> {
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
  public async update(id: string, by: string, update: SBDocumentUpdate<T>): Promise<SBDocument<T> | undefined> {
    try {
      const response = await this._collection.docRef(id).update(update, by);
      return response.doc;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async updateBatch(updates: { id: string; updates: SBDocumentUpdate<T> }[], by: string): Promise<SBDocument<T>[] | undefined> {
    try {
      const docs = await this._collection.updateDocs(updates, by);
      return docs;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async delete(id: string): Promise<string | undefined> {
    try {
      const response = await this._collection.docRef(id).delete();
      if (response.success && response.doc) {
        return response.doc._id;
      } else {
        return undefined;
      }
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async deleteBatch(ids: string[]): Promise<string[] | undefined> {
    try {
      // Wait for all promises to resolve
      const responses = await this.collection.deleteDocs(ids);
      // Get all the ids of the deleted documents
      const deletedIds = responses
        .map((r) => {
          if (r.success && r.doc) {
            return r.doc._id;
          } else {
            return undefined;
          }
        })
        .filter((id) => id !== undefined) as string[];
      if (deletedIds.length > 0) {
        return deletedIds;
      } else {
        return undefined;
      }
    } catch (error) {
      this.printError(error);
      return undefined;
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
