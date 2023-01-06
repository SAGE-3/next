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

  public async get(id: string): Promise<SBDocument<T> | undefined> {
    try {
      const doc = await this._collection.docRef(id).read();
      return doc;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async getAll(): Promise<SBDocument<T>[] | undefined> {
    try {
      const docs = await this._collection.getAllDocs();
      return docs;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async query(field: keyof T, query: string | number): Promise<SBDocument<T>[] | undefined> {
    try {
      const docs = await this._collection.query(field, query);
      return docs;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async update(id: string, by: string, update: SBDocumentUpdate<T>): Promise<boolean> {
    try {
      const response = await this._collection.docRef(id).update(update, by);
      return response.success;
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
