/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType } from 'redis';
import { v4 } from 'uuid';

export type SBSetType = Array<string>;

// The Format of the actual SAGEBase Document
// .data has the actual USER set data
export type SBSet = {
  _id: string;
  _createdAt: number;
  _createdBy: string;
  _updatedAt: number;
  _updatedBy: string;
  _key: string;
};

export type SBSetWriteResult = {
  success: boolean;
  writetime: number;
  doc: SBSetType | undefined;
};

export type SBSetCreateMessage = {
  type: 'CREATE';
  col: string;
  doc: SBSetType;
};

export type SBSetDeleteMessage = {
  type: 'DELETE';
  col: string;
  doc: SBSetType;
};

export type SBSetUpdateMessage = {
  type: 'UPDATE';
  col: string;
  doc: SBSet;
  updates: SBSetType;
};

export type SBSetMessage = SBSetCreateMessage | SBSetDeleteMessage;

/**
 * Collections for Sets
 */
export class SBCollectionSetRef {
  private _name;
  private _path: string;
  private _redisClient: RedisClientType;

  /**
   *
   * @param name The name of the collection
   * @param path The "collections" path in the database
   * @param redisClient The redis client
   */
  constructor(name: string, path: string, redisClient: RedisClientType) {
    this._name = name;
    this._path = path;
    this._redisClient = redisClient;
  }

  /**
   * Create a new SBDocument from the provided 'data' and add it to the collection.
   * @param data The data of the document
   * @returns {SBDocumentRef<Type> | undefined} A SBDocumentRef that points to the newly added document. Undefined if the operation was unsuccessful
   */
  public async addDoc(data: SBSetType, by: string): Promise<SBSetRef | undefined> {
    try {
      const setPath = `${this._path}:set`;
      const doc = generateSBSetTemplate(setPath, by);
      const docPath = `${this._path}:${doc._id}`;
      const docRef = new SBSetRef(doc._id, this._name, docPath, this._redisClient);
      const redisRes = await docRef.set(data, by);
      if (redisRes.success) {
        return docRef;
      } else {
        return undefined;
      }
    } catch (error) {
      this.ERRORLOG(error);
      return undefined;
    }
  }

  /**
   * Get a document refernce from the collection by id.
   * @param {string} id The id of the document within the collection
   * @returns {SBDocumentRef<Type>} A SBDocumentRef that points to the newly added document
   */
  public docRef(id: string): SBSetRef {
    const docPath = `${this._path}:${id}`;
    const docRef = new SBSetRef(id, this._name, docPath, this._redisClient);
    return docRef;
  }

  /**
   * Get all the SBSet in the collection.
   * @returns {Promise<SBSet<Type>[]>} An array of SBSet.
   */
  public async getAllDocs(): Promise<SBSet[]> {
    const docRefs = await this.getAllDocRefs();
    const promises = docRefs.map((docRef) => docRef.read());
    const docs = await Promise.all(promises);
    if (docs) {
      const returnList = [] as SBSet[];
      docs.forEach((doc) => {
        if (doc !== undefined) returnList.push(doc);
      });
      return returnList;
    } else {
      return [];
    }
  }

  /**
   * Get all the SBSetsRefs in the collection
   * @returns { Promise<SBSetRef[]>} An array of SBSetRef
   */
  public async getAllDocRefs(): Promise<SBSetRef[]> {
    try {
      const redisRes = await this._redisClient.keys(`${this._path}:*`);
      const docRefList = [] as SBSetRef[];
      redisRes.forEach((key) => {
        // skip the actual sets
        if (!key.endsWith('_set')) {
          const id = key.split(':')[key.split(':').length - 1];
          const docRef = new SBSetRef(id, this._name, key, this._redisClient);
          docRefList.push(docRef);
        }
      });
      return docRefList;
    } catch (error) {
      this.ERRORLOG(error);
      return [];
    }
  }

  /**
   * Delete an array of documents from the collection.
   * Send only one publish event for all the documents.
   */
  public async deleteDocs(ids: string[]): Promise<SBSetWriteResult[]> {
    const docRefs = ids.map((id) => this.docRef(id));
    const promises = docRefs.map((docRef) => docRef.delete(false));
    const res = await Promise.all(promises);
    return res;
  }

  /**
   * Prints errors related to SBCollection
   * @param {unknown} error
   */
  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBCollectionSet ERROR: ', error);
  }

  /**
   * Prints info related to SBCollection
   * @param {unknown} error
   */
  private INFOLOG(error: unknown) {
    console.log('SAGEBase SBCollectionSet INFO: ', error);
  }
}

/**
 * A database reference to the SAGEBase Document.
 */
export class SBSetRef {
  private _id: string;
  private _path: string;
  private _redisClient: RedisClientType;
  private _colName: string;

  constructor(id: string, collection: string, path: string, redisClient: RedisClientType) {
    this._id = id;
    this._path = path;
    this._colName = collection;
    this._redisClient = redisClient;
  }

  // ID of the document
  public get id(): string {
    return this._id;
  }

  // The REDIS Key of the document
  private get path(): string {
    return this._path;
  }

  //
  private get redis(): RedisClientType {
    return this._redisClient;
  }

  /**
   * Read the document from the database
   * @returns {Type} This document
   */
  public async read(): Promise<SBSet | undefined> {
    try {
      const redisRes = await this.redis.json.get(`${this._path}`);
      return redisRes as SBSet;
    } catch (error) {
      this.ERRORLOG(error);
      return undefined;
    }
  }
  /**
   * Read the document from the database
   * @returns {Type} This document
   */
  public async readSet(): Promise<SBSetType | undefined> {
    try {
      const redisRes = await this.redis.sMembers(`${this._path}_set`);
      return redisRes as SBSetType;
    } catch (error) {
      this.ERRORLOG(error);
      return undefined;
    }
  }

  /**
   * Set this document in the database. Overwrites the current data.
   * @param data The data
   * @returns
   */
  public async set(data: SBSetType, by: string): Promise<SBSetWriteResult> {
    try {
      const doc = generateSBSetTemplate(this.path + '_set', by);
      doc._id = this.id;
      const redisRes1 = await this._redisClient.json.set(this.path, '.', doc);
      await this._redisClient.del(`${this.path}_set`);
      await this._redisClient.sAdd(`${this.path}_set`, data);
      const response = redisRes1 == 'OK' ? generateWriteResult(true, data) : generateWriteResult(false);
      return response;
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult(false);
    }
  }

  /**
   *
   * @param update
   * @returns
   */
  public async add(update: SBSetType, by: string): Promise<SBSetWriteResult> {
    if (update === undefined) return generateWriteResult(false);
    // Check if Doc exists
    const exists = await this._redisClient.exists(`${this.path}_set`);
    if (exists === 0) {
      this.ERRORLOG(`Doc does not exists.`);
      return generateWriteResult(false);
    }
    try {
      const redisRes = await this._redisClient.sAdd(`${this.path}_set`, update);
      const res = redisRes === update.length ? true : false;
      if (res) {
        // Refresh the updatedAt and updatedBy
        await this.refreshUpdate(by);
        // Get the new document value
        const newValue = await this.readSet();
        // Generate the response and return it
        return generateWriteResult(true, newValue);
      } else {
        // The document wasn't updated
        return generateWriteResult(false);
      }
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult(false);
    }
  }

  private async refreshUpdate(by?: string): Promise<void> {
    const updatedAt = Date.now();
    const redisRes = await this._redisClient.json.set(`${this.path}`, `._updatedAt`, updatedAt, { XX: true });
    if (redisRes && redisRes != 'OK') {
      console.error('refreshUpdate', redisRes);
    }
    if (by) {
      const res = await this._redisClient.json.set(`${this.path}`, `._updatedBy`, by, { XX: true });
      if (res && res != 'OK') {
        console.error('refreshUpdate', res);
      }
    }
  }

  public async delete(publish = true): Promise<SBSetWriteResult> {
    try {
      const oldValue = await this.readSet();
      if (oldValue == undefined) {
        return generateWriteResult(false);
      }
      const redisRes = await this._redisClient.del(`${this.path}`);
      await this._redisClient.del(`${this.path}_set`);
      const res = redisRes === undefined || redisRes === 0 ? false : true;
      if (res === true && publish) {
        await this.publishDeleteAction(oldValue);
      }
      return generateWriteResult(res, oldValue);
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult(false);
    }
  }

  // public async subscribe(callback: (message: SBSetMessage<Type>) => void) {
  //   const subscriber = this._redisClient.duplicate();
  //   await subscriber.connect();

  //   await subscriber.subscribe(`${this.path}`, (message: string) => {
  //     const parsedMsg = JSON.parse(message) as SBSetMessage SBSetRef<Type>;
  //     parsedMsg.col = this._colName;
  //     callback(parsedMsg);
  //   });

  //   return async () => {
  //     await subscriber.unsubscribe(`${this.path}`);
  //     await subscriber.disconnect();
  //   };
  // }

  private async publishCreateAction(doc: SBSetType): Promise<void> {
    const action = {
      type: 'CREATE',
      col: this._colName,
      doc: doc,
    } as SBSetCreateMessage;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private async publishUpdateAction(doc: SBSet, updates: SBSetType): Promise<void> {
    const action = {
      type: 'UPDATE',
      col: this._colName,
      doc: doc,
      updates: updates,
    } as SBSetUpdateMessage;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private async publishDeleteAction(doc: SBSetType): Promise<void> {
    const action = {
      type: 'DELETE',
      col: this._colName,
      doc: doc,
    } as SBSetDeleteMessage;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBDocumentRef ERROR: ', error);
  }
}

function generateWriteResult(success: boolean, doc?: SBSetType): SBSetWriteResult {
  const result = {
    success,
    writetime: Date.now(),
    doc,
  } as SBSetWriteResult;
  return result;
}

export function generateSBSetTemplate(key: string, by: string): SBSet {
  const id = v4();
  const createdAt = Date.now();
  const updatedAt = createdAt;
  const doc = {
    _id: id,
    _createdAt: createdAt,
    _createdBy: by,
    _updatedAt: updatedAt,
    _updatedBy: by,
    _key: key,
  } as SBSet;
  return doc;
}
