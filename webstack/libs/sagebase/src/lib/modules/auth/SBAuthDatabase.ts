/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType, SchemaFieldTypes } from 'redis';
import { v4 } from 'uuid';

// Extra profile data passed from auth providers when creating/finding auth records
export type AuthExtras = {
  displayName?: string;
  email?: string;
  picture?: string;
  role?: string;
};

// Local user credential record (stored separately from session identity)
export type LocalUserRecord = {
  username: string;
  passwordHash: string;
  displayName: string;
  email: string;
  createdAt: string;
};

// The Auth Schema
export type SBAuthSchema = {
  password: string;
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

  public async deleteAllTemporaryAccounts(): Promise<void> {
    // Delete all keys with the prefix 'guest'
    const guestKeys = await this._redisClient.keys(`${this._prefix}:guest*`);
    for (const key of guestKeys) {
      await this._redisClient.del(key);
    }
    const spectatorKeys = await this._redisClient.keys(`${this._prefix}:spectator*`);
    for (const key of spectatorKeys) {
      await this._redisClient.del(key);
    }
  }

  /**
   * Create an index for the SBAuth database.
   */
  private async createIndex(): Promise<void> {
    try {
      await this._redisClient.ft.dropIndex(this._indexName);
    } catch {
      // Index does not exist yet — will be created below
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
        '$.email': {
          type: SchemaFieldTypes.TAG,
          AS: 'email',
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
  public async findOrAddAuth(provider: string, providerId: string, extras?: AuthExtras): Promise<SBAuthSchema | undefined> {
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
  public async addAuth(provider: string, providerId: string, extras?: AuthExtras): Promise<SBAuthSchema | undefined> {
    const doc = {
      provider,
      providerId,
      id: v4(),
      displayName: extras?.displayName,
      email: extras?.email,
      picture: extras?.picture,
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
      this.ERRORLOG(error);
      return undefined;
    }
  }

  /**
   * Find an Auth by email
   * @param email The email to search for
   */
  public async deleteAuthByEmail(email: string): Promise<SBAuthSchema | undefined> {
    try {
      const escapedQuery = email.replace(/[@.]/g, '\\$&');
      const response = await this._redisClient.ft.search(this._indexName, `@email:{${escapedQuery}}`);
      const docs = response.documents;
      if (docs.length > 1) {
        console.error('SBAuth> Multiple auth records found for email:', email);
        return undefined;
      } else if (docs.length == 0) {
        return undefined;
      } else {
        const provider = docs[0].value.provider as string;
        const providerId = docs[0].value.providerId as string;
        if (provider && providerId) {
          const result = await this.deleteAuth(provider, providerId);
          return result ? (docs[0].value as SBAuthSchema) : undefined;
        } else {
          return undefined;
        }
      }
    } catch (error) {
      this.ERRORLOG(error);
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
    console.error('SAGEBase SBAuthDatabase ERROR: ', error);
  }

  // -------------------------------------------------------------------------
  // Local user credential store (separate from session identity records)
  // Keys: <prefix>:LOCAL_USERS:<username>  (Redis Hash)
  // -------------------------------------------------------------------------

  private localUserKey(username: string): string {
    return `${this._prefix}:LOCAL_USERS:${username}`;
  }

  /**
   * Create a new local user credential record.
   * Returns undefined if the username already exists.
   */
  public async createLocalUser(
    username: string,
    passwordHash: string,
    displayName = '',
    email = ''
  ): Promise<LocalUserRecord | undefined> {
    const key = this.localUserKey(username);
    const exists = await this._redisClient.exists(key);
    if (exists) return undefined;
    const record: LocalUserRecord = { username, passwordHash, displayName, email, createdAt: new Date().toISOString() };
    await this._redisClient.hSet(key, record as unknown as Record<string, string>);
    return record;
  }

  /**
   * Retrieve a local user credential record by username.
   */
  public async getLocalUser(username: string): Promise<LocalUserRecord | undefined> {
    const key = this.localUserKey(username);
    const data = await this._redisClient.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return undefined;
    return data as unknown as LocalUserRecord;
  }

  /**
   * Delete a local user credential record.
   * Also removes the session identity record to invalidate stale sessions.
   */
  public async deleteLocalUser(username: string): Promise<boolean> {
    const credDeleted = await this._redisClient.del(this.localUserKey(username));
    await this.deleteAuth('local', username);
    return credDeleted > 0;
  }

  /**
   * List all local users (without password hashes).
   */
  public async listLocalUsers(): Promise<Omit<LocalUserRecord, 'passwordHash'>[]> {
    const keys = await this._redisClient.keys(`${this._prefix}:LOCAL_USERS:*`);
    const users: Omit<LocalUserRecord, 'passwordHash'>[] = [];
    for (const key of keys) {
      const data = await this._redisClient.hGetAll(key);
      if (data && data.username) {
        const { passwordHash: _omitted, ...safe } = data as unknown as LocalUserRecord;
        users.push(safe);
      }
    }
    return users;
  }
}

export { SBAuthDatabase };
export const SBAuthDB = new SBAuthDatabase();
