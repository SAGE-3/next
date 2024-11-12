/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType } from 'redis';
import { v4 } from 'uuid';
import { PathValue, DotNestedKeys } from './Util';
import { SBLogger } from '../logger/SBLogger';

// The Supported primitives and types in the Database
export type SBJSON = { [prop: string]: SBPrimitive };
type SBArray = Array<SBPrimitive>;
export type SBPrimitive = null | boolean | number | string | SBArray | SBJSON;

// The Format of the actual SAGEBase Document
// .data has the actual USER set data
export type SBDocument<Type extends SBJSON> = {
  _id: string;
  _createdAt: number;
  _createdBy: string;
  _updatedAt: number;
  _updatedBy: string;
  data: Type;
};

export type SBDocumentUpdate<Type> = Partial<{ [Key in DotNestedKeys<Type>]: PathValue<Type, Key> }> & Partial<Type>;

export type SBDocWriteResult<Type extends SBJSON> = {
  success: boolean;
  writetime: number;
  doc: SBDocument<Type> | undefined;
};

export type SBDocumentCreateMessage<Type extends SBJSON> = {
  type: 'CREATE';
  col: string;
  doc: SBDocument<Type>[];
};

export type SBDocumentUpdateMessage<Type extends SBJSON> = {
  type: 'UPDATE';
  col: string;
  doc: SBDocument<Type>[];
  updates: { id: string; updates: Partial<Type> }[];
};

export type SBDocumentDeleteMessage<Type extends SBJSON> = {
  type: 'DELETE';
  col: string;
  doc: SBDocument<Type>[];
};

export type SBDocumentMessage<Type extends SBJSON> =
  | SBDocumentCreateMessage<Type>
  | SBDocumentUpdateMessage<Type>
  | SBDocumentDeleteMessage<Type>;

/**
 * A database reference to the SAGEBase Document.
 */
export class SBDocumentRef<Type extends SBJSON> {
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
  public async read(): Promise<SBDocument<Type> | undefined> {
    try {
      const redisRes = await this.redis.json.get(`${this._path}`);
      return redisRes as SBDocument<Type>;
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
  public async set(data: Type, by: string, ttl: number, publish = true): Promise<SBDocWriteResult<Type>> {
    try {
      const doc = generateSBDocumentTemplate<Type>(data, by);
      doc._id = this.id;
      const redisRes = await this._redisClient.json.set(this.path, '.', doc);
      if (ttl > -1) {
        // Set the Time to Live, in sec.
        this._redisClient.expire(this.path, ttl);
      }
      const response =
        redisRes == 'OK'
          ? generateWriteResult<Type>('create', this._colName, true, doc)
          : generateWriteResult<Type>('create', this._colName, false);
      if (publish) {
        await this.publishCreateAction(doc);
      }
      return response;
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult('create', this._colName, false);
    }
  }

  /**
   *
   * @param update
   * @returns
   */
  public async update(update: SBDocumentUpdate<Type>, by: string, publish = true): Promise<SBDocWriteResult<Type>> {
    if (update === undefined) return generateWriteResult('update', this._colName, false);
    const pub = publish === undefined ? true : publish;
    // Check if Doc exists
    const exists = await this._redisClient.exists(`${this.path}`);
    if (exists === 0) {
      this.ERRORLOG(`Doc does not exists.`);
      return generateWriteResult('update', this._colName, false);
    }
    try {
      // Check if a property on the document was updated
      let updated = false;
      // Update all the properties
      const updatePromises = Object.keys(update).map(async (key) => {
        const value = update[key] as Type[string];
        // XX - only set the key if it already exists
        // const redisRes = await this._redisClient.json.set(`${this.path}`, `.data.${key}`, value, { XX: true });
        const redisRes = await this._redisClient.json.set(`${this.path}`, `.data.${key}`, value);
        // If one of the properties was updated, then the document was updated
        const res = redisRes === 'OK' ? true : false;
        if (res === true) {
          updated = true;
        }
      });
      await Promise.all(updatePromises);
      // The document was updated
      if (updated) {
        // Refresh the updatedAt and updatedBy
        await this.refreshUpdate(by);
        // Get the new document value
        const newValue = await this.read();
        // Publish the new document value
        if (newValue && pub) {
          await this.publishUpdateAction(newValue, update);
        }
        // Generate the response and return it
        return generateWriteResult<Type>('update', this._colName, true, newValue);
      } else {
        // The document wasn't updated
        return generateWriteResult<Type>('update', this._colName, false);
      }
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult<Type>('update', this._colName, false);
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

  /**
   * Change the _createdBy field of the document
   */
  public async updateCreatedBy(newId: string): Promise<SBDocWriteResult<Type>> {
    const redisRes = await this._redisClient.json.set(`${this.path}`, `._createdBy`, newId, { XX: true });
    if (redisRes && redisRes != 'OK') {
      this.refreshUpdate(newId);
      console.error('updateCreatedBy', redisRes);
      return generateWriteResult<Type>('update', this._colName, false);
    } else {
      const newValue = await this.read();
      // Publish the new document value
      if (newValue) {
        await this.publishUpdateAction(newValue, {});
      }
      return generateWriteResult<Type>('update', this._colName, true, newValue);
    }
  }

  public async delete(publish = true): Promise<SBDocWriteResult<Type>> {
    try {
      const oldValue = await this.read();
      if (oldValue == undefined) {
        return generateWriteResult('delete', this._colName, false);
      }
      const redisRes = await this._redisClient.json.del(`${this.path}`);
      const res = redisRes === undefined || redisRes === 0 ? false : true;
      if (res === true && publish) {
        await this.publishDeleteAction(oldValue);
      }
      return generateWriteResult('delete', this._colName, res, oldValue);
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult('delete', this._colName, false);
    }
  }

  public async subscribe(callback: (message: SBDocumentMessage<Type>) => void) {
    const subscriber = this._redisClient.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(`${this.path}`, (message: string) => {
      const parsedMsg = JSON.parse(message) as SBDocumentMessage<Type>;
      parsedMsg.col = this._colName;
      callback(parsedMsg);
    });

    return async () => {
      await subscriber.unsubscribe(`${this.path}`);
      await subscriber.disconnect();
    };
  }

  private async publishCreateAction(doc: SBDocument<Type>): Promise<void> {
    const action = {
      type: 'CREATE',
      col: this._colName,
      doc: [doc],
    } as SBDocumentCreateMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private async publishUpdateAction(doc: SBDocument<Type>, updates: Partial<Type>): Promise<void> {
    const action = {
      type: 'UPDATE',
      col: this._colName,
      doc: [doc],
      updates: [{ id: doc._id, updates }],
    } as SBDocumentUpdateMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }
  private async publishDeleteAction(doc: SBDocument<Type>): Promise<void> {
    const action = {
      type: 'DELETE',
      col: this._colName,
      doc: [doc],
    } as SBDocumentDeleteMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBDocumentRef ERROR: ', error);
  }
}

type WriteResultAction = 'create' | 'update' | 'delete';

function generateWriteResult<Type extends SBJSON>(
  action: WriteResultAction,
  collection: string,
  success: boolean,
  doc?: SBDocument<Type>
): SBDocWriteResult<Type> {
  const result = {
    success,
    writetime: Date.now(),
    doc,
  } as SBDocWriteResult<Type>;
  // only the create and delete actions are logged to limit the amount of logs
  if (success && (action === 'create' || action === 'delete')) {
    SBLogger.log(collection, action, result);
  }
  return result;
}

export function generateSBDocumentTemplate<Type extends SBJSON>(data: Type, by: string): SBDocument<Type> {
  const id = v4();
  const createdAt = Date.now();
  const updatedAt = createdAt;
  const dataCopy = JSON.parse(JSON.stringify(data)) as Type;
  const doc = {
    _id: id,
    _createdAt: createdAt,
    _createdBy: by,
    _updatedAt: updatedAt,
    _updatedBy: by,
    data: { ...dataCopy },
  } as SBDocument<Type>;
  return doc;
}
