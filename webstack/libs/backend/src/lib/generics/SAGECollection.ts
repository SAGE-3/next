/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { SAGEBase, SBCollectionRef, SBDocumentMessage, SBDocument, SBJSON, SBDocumentUpdate } from '@sage3/sagebase';
import { APIClientWSMessage } from '@sage3/shared/types';
import { Router } from 'express';
import { SubscriptionCache } from '../utils';
import { sageRouter } from './SAGERouter';
import { sageWSRouter } from './SAGEWSRouter';


///////////////////////////////////////////////////////////////////////////////
// SAGEBase collection
///////////////////////////////////////////////////////////////////////////////

export class SAGECollection<T extends SBJSON> {

  private _collection!: SBCollectionRef<T>;
  private _name: string;
  private _queryableAttributes: Partial<T>;

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

  public async initialize(): Promise<void> {
    this._collection = await SAGEBase.Database.collection<T>(this.name, this._queryableAttributes);
  }

  public async add(item: T, id?: string): Promise<SBDocument<T> | undefined> {
    try {
      const docRef = await this._collection.addDoc(item, id);
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

  public async query(field: keyof T, query: Partial<T>): Promise<SBDocument<T>[] | undefined> {
    try {
      const q = query[field];
      if (typeof q !== 'string' || typeof q !== typeof 'number') return undefined;
      const boards = await this._collection.query(field, q);
      return boards;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public async update(id: string, update: SBDocumentUpdate<T>): Promise<boolean> {
    try {
      const response = await this._collection.docRef(id).update(update);
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

  public async subscribeByBoardId(field: keyof T, value: string, callback: (message: SBDocumentMessage<T>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this._collection.subscribeToQuery(field, value, callback);
      return unsubscribe;
    } catch (error) {
      this.printError(error);
      return undefined;
    }
  }

  public httpRouter(): Router {
    return sageRouter<T>(this);
  }

  public wsRouter(socket: WebSocket, message: APIClientWSMessage, cache: SubscriptionCache) {
    return sageWSRouter<T>(this, socket, message, cache);
  }

  protected printMessage(message: string) {
    console.log(`SAGECollection ${this.name}> ${message}`);
  }

  protected printError(message: string) {
    console.error(`SAGECollection ${this.name}> ${message}`);
  }

  protected printWarn(message: string) {
    console.warn(`SAGECollection ${this.name}> ${message}`);
  }

}
