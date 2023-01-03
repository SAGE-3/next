/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType, SchemaFieldTypes } from 'redis';
import { v4 } from 'uuid';

// The Auth Schema
export type SBAuthSchema = {
  provider: string;
  providerId: string;
  id: string;
  // data to pass from auth provider to account
  displayName?: string;
  email?: string;
  picture?: string;
};

/**
 * The SAGEBase Database interface for the SBAuth Class
 */
class SBAuthDatabase {
  private _redisClient!: RedisClientType;

  private _prefix!: string;
  private _indexName!: string;

  public async init(redisclient: RedisClientType, prefix: string): Promise<void> {
    this._redisClient = redisclient.duplicate();
    await this._redisClient.connect();

    this._prefix = prefix + ':DB';
    this._indexName = 'idx:auth';
    await this.createIndex();

    return;
  }

  /**
   * Create an index for the SBAuth database.
   */
  private async createIndex(): Promise<void> {
    try {
      await this._redisClient.ft.dropIndex(this._indexName);
    } catch (error) {
      console.log('Index doesnt exist yet, creating it now.');
    }
    await this._redisClient.ft.create(
      this._indexName,
      {
        '$.provider': {
          type: SchemaFieldTypes.TEXT,
          AS: 'provider',
        },
        '$.providerId': {
          type: SchemaFieldTypes.TEXT,
          AS: 'providerId',
        },
      },
      {
        ON: 'JSON',
        PREFIX: this._prefix,
      }
    );
    return;
  }

  /**
   * A function to find an auth, and if one doesn't exist add it.
   * Can still return undefined if the add was unsucessful
   * @param provider The provider name ('google', 'guest', 'jwt')
   * @param providerId The unique id for the provider
   * @returns {SBAuthSchema|undered} returns an SBAuthSchema if one was found or added succesfully.
   */
  public async findOrAddAuth(provider: string, providerId: string, extras?: any): Promise<SBAuthSchema | undefined> {
    let auth = await this.readAuth(provider, providerId);
    if (auth != undefined) {
      return auth;
    } else {
      auth = await this.addAuth(provider, providerId, extras);
      return auth;
    }
  }

  /**
   * Add a new Auth to the database
   * @param provider The provider name ('google', 'guest', 'jwt')
   * @param providerId The unique id for the provider
   * @returns {SBAuthSchema|undered} returns an SBAuthscema if add was successful
   */
  public async addAuth(provider: string, providerId: string, extras: any): Promise<SBAuthSchema | undefined> {
    const doc = {
      provider,
      providerId,
      id: v4(),
      displayName: extras.displayName,
      email: extras.email,
      picture: extras.picture,
    } as SBAuthSchema;
    const key = provider + providerId;
    const redisRes = await this._redisClient.json.set(`${this._prefix}:${key}`, '.', doc);
    if (redisRes == 'OK') {
      return doc;
    } else {
      return undefined;
    }
  }

  /**
   * Read an Auth from the database
   * @param provider The provider name ('google', 'guest', 'jwt')
   * @param providerId The unique id for the provider
   * @returns {SBAuthSchema|undered} returns an SBAuthscema if one exists
   */
  public async readAuth(provider: string, providerId: string): Promise<SBAuthSchema | undefined> {
    try {
      const key = provider + providerId;
      const response = await this._redisClient.json.get(`${this._prefix}:${key}`);
      return response as SBAuthSchema;
    } catch (error) {
      console.log('SAGEBase SBAuthDatabase error> ', error);
      return undefined;
    }
  }

  /**
   * Delete an SBAuth from the database
   * @returns {Promise<boolean>} Returns true if delete was successful
   */
  public async deleteAuth(provider: string, providerId: string): Promise<boolean> {
    try {
      const key = provider + providerId;
      const response = await this._redisClient.json.del(`${this._prefix}:${key}`);
      return response > 0 ? true : false;
    } catch (error) {
      this.ERRORLOG(error);
      return false;
    }
  }

  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBAuthDatabase ERROR: ', error);
  }
}

export type { SBAuthDatabase };
export const SBAuthDB = new SBAuthDatabase();
