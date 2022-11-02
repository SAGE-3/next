/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RedisClientType } from 'redis';
import { v4 } from 'uuid';
import { PathValue, DotNestedKeys } from './Util';

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

export type SBDocWriteResult = {
  success: boolean;
  writetime: number;
};

export type SBDocumentCreateMessage<Type extends SBJSON> = {
  type: 'CREATE';
  col: string;
  doc: SBDocument<Type>;
};

export type SBDocumentUpdateMessage<Type extends SBJSON> = {
  type: 'UPDATE';
  col: string;
  doc: SBDocument<Type>;
  updates: Partial<Type>;
};

export type SBDocumentDeleteMessage<Type extends SBJSON> = {
  type: 'DELETE';
  col: string;
  doc: SBDocument<Type>;
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
  public async set(data: Type, by: string, ttl: number): Promise<SBDocWriteResult> {
    try {
      const doc = generateSBDocumentTemplate<Type>(data, by);
      doc._id = this.id;
      const redisRes = await this._redisClient.json.set(this.path, '.', doc);
      if (ttl > -1) {
        // Set the Time to Live, in sec.
        this._redisClient.expire(this.path, ttl);
      }
      const response = redisRes == 'OK' ? generateWriteResult(true) : generateWriteResult(false);
      await this.publishCreateAction(doc);
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
  public async update(update: SBDocumentUpdate<Type>, by?: string): Promise<SBDocWriteResult> {
    if (update === undefined) return generateWriteResult(false);
    // Check if Doc exists
    const exists = await this._redisClient.exists(`${this.path}`);
    if (exists === 0) {
      this.ERRORLOG(`Doc does not exists.`);
      return generateWriteResult(false);
    }
    try {
      let updated = false;
      const updatePromises = Object.keys(update).map(async (key) => {
        const value = update[key] as Type[string];
        // XX - only set the key if it already exists
        // const redisRes = await this._redisClient.json.set(`${this.path}`, `.data.${key}`, value, { XX: true });
        const redisRes = await this._redisClient.json.set(`${this.path}`, `.data.${key}`, value);
        const res = redisRes === 'OK' ? true : false;
        if (res === true) {
          updated = true;
        }
      });
      await Promise.all(updatePromises);
      if (updated) {
        await this.refreshUpdate(by);
        const newValue = await this.read();
        if (newValue) {
          await this.publishUpdateAction(newValue, update);
        }
      }
      return generateWriteResult(true);
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

  public async delete(): Promise<SBDocWriteResult> {
    try {
      const oldValue = await this.read();
      if (oldValue == undefined) {
        return generateWriteResult(false);
      }
      const redisRes = await this._redisClient.json.del(`${this.path}`);
      const res = redisRes === undefined || redisRes === 0 ? false : true;
      if (res === true) {
        await this.publishDeleteAction(oldValue);
      }
      return generateWriteResult(res);
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult(false);
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
      doc: doc,
    } as SBDocumentCreateMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private async publishUpdateAction(doc: SBDocument<Type>, updates: Partial<Type>): Promise<void> {
    const action = {
      type: 'UPDATE',
      doc: doc,
      updates,
    } as SBDocumentUpdateMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }
  private async publishDeleteAction(doc: SBDocument<Type>): Promise<void> {
    const action = {
      type: 'DELETE',
      doc: doc,
    } as SBDocumentDeleteMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBDocumentRef ERROR: ', error);
  }
}

function generateWriteResult(success: boolean): SBDocWriteResult {
  const result = {
    success,
    writetime: Date.now(),
  } as SBDocWriteResult;
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
