/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { SAGEBase, SBCollectionRef, SBDocumentMessage, SBDocument, SBJSON, SBDocumentUpdate } from '@sage3/sagebase';

type callbackFunc = (item: SBDocumentMessage<SBJSON>) => void;
type returnCallback = Promise<() => Promise<void>>;

///////////////////////////////////////////////////////////////////////////////
// SAGEBase collection
///////////////////////////////////////////////////////////////////////////////

export class niceCollection<T extends SBJSON> {
  private db!: SBCollectionRef<T>;
  private name: string;

  constructor(n: string) {
    this.name = n;
  }

  getName(): string {
    return this.name;
  }

  async init(itemQuery: Partial<T>, callback: callbackFunc): returnCallback {
    this.db = await SAGEBase.Database.collection<T>(this.name, itemQuery);
    return this.subscribe(callback);
  }

  async subscribe(callback: (item: SBDocumentMessage<T>) => void): returnCallback {
    const unsubscribe = await this.db.subscribe(callback);
    return unsubscribe;
  }

  async addItem(item: T): Promise<string | undefined> {
    const itref = await this.db.addDoc(item);
    if (itref) {
      const it = await itref.read();
      if (it) {
        return it._id;
      }
    }
    return undefined;
  }

  async subQuery(prop: string, value: string, callback: callbackFunc): returnCallback {
    return await this.db.subscribeToQuery(prop, value, callback);
  }

  async getAllItems(): Promise<SBDocument<T>[]> {
    // Get all items
    return this.db.getAllDocs();
  }

  async getItem(id: string): Promise<SBDocument<T> | undefined> {
    const response = this.db.docRef(id);
    if (response) {
      const item = await response.read();
      return item;
    }
    return undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    const response = this.db.docRef(id);
    if (response) {
      const res = await response.delete();
      return res.success;
    }
    return false;
  }

  async updateItem(id: string, data: SBDocumentUpdate<T>): Promise<boolean> {
    const response = this.db.docRef(id);
    if (response) {
      const res = await this.db.docRef(id).update(data);
      return res.success;
    }
    return false;
  }

  async clear(): Promise<void> {
    const all = await this.db.getAllDocs();
    all.forEach((doc) => {
      this.deleteItem(doc._id);
    });
  }

  async searchItemByProp(prop: keyof T, value: string | number): Promise<(SBDocument<T> | undefined)[]> {
    const response = await this.db.query(prop, value);
    return response;
  }
}
