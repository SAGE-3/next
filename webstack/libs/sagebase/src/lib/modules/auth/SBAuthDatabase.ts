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

// The Auth Schema
export type SBAuthSchema = {
  provider: string;
  providerId: string;
  id: string;
  // data to pass from auth provider to account
  displayName?: string;
  email?: string;
  picture?: string;
  // Role resolved by the auth provider itself (currently only LDAP, via
  // group→role mapping). Providers that don't resolve a role never set
  // this, so it stays undefined for them — see permissions.ts's
  // convertProviderToRole, which prefers this over the coarse provider map.
  role?: string;
};

/**
 * The SAGEBase Database interface for the SBAuth Class
 */
export class SBAuthDatabase {
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
    // Delte all keys with the prefix 'guest'
    const guestKeys = await this._redisClient.keys(`${this._prefix}:guest*`);
    for (const key of guestKeys) {
      await this._redisClient.del(key);
    }
    console.log('SBAuth> Deleted all guest accounts. Count:', guestKeys.length);
    const spectatorKeys = await this._redisClient.keys(`${this._prefix}:spectator*`);
    for (const key of spectatorKeys) {
      await this._redisClient.del(key);
    }
    console.log('SBAuth> Deleted all spectator accounts. Count:', spectatorKeys.length);
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
        '$.email': {
          type: SchemaFieldTypes.TAG,
          AS: 'email',
        },
        '$.id': {
          type: SchemaFieldTypes.TAG,
          AS: 'id',
        },
      },
      {
        ON: 'JSON',
        PREFIX: this._prefix,
      },
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
      // Re-sync the role on every login for providers that resolve one
      // dynamically (LDAP group membership can change between logins —
      // access granted by group membership must also be revoked by it).
      // Providers that never resolve a role (extras.role undefined) leave
      // whatever's already stored untouched.
      if (extras?.role !== undefined && auth.role !== extras.role) {
        auth = await this.updateAuthField(provider, providerId, 'role', extras.role);
      }
      // Same for the email: the identity provider is the reference, and a record
      // created without an email (a login without the email scope) gets it at the next login.
      if (auth && extras?.email && auth.email !== extras.email) {
        auth = await this.updateAuthField(provider, providerId, 'email', extras.email);
      }
      return auth;
    } else {
      auth = await this.addAuth(provider, providerId, extras);
      return auth;
    }
  }

  /**
   * Update the persisted role on an existing Auth record.
   */
  public async updateAuthRole(provider: string, providerId: string, role: string): Promise<SBAuthSchema | undefined> {
    return this.updateAuthField(provider, providerId, 'role', role);
  }

  /**
   * Update one field (role or email) of an existing Auth record.
   */
  private async updateAuthField(provider: string, providerId: string, field: 'role' | 'email', value: string) {
    try {
      const key = provider + providerId;
      await this._redisClient.json.set(`${this._prefix}:${key}`, `$.${field}`, value);
      return await this.readAuth(provider, providerId);
    } catch (error) {
      this.ERRORLOG(error);
      return undefined;
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
      role: extras?.role,
    } as SBAuthSchema;
    const key = provider + providerId;
    // NX: only write if the key doesn't already exist. Two concurrent
    // first-time logins for the same identity can both pass findOrAddAuth's
    // readAuth() check before either has written — without this, both would
    // call addAuth and mint a different v4() id, with whichever write lands
    // last silently winning and the other caller returning a stale id that
    // no longer matches what's persisted.
    const redisRes = await this._redisClient.json.set(`${this._prefix}:${key}`, '.', doc, { NX: true });
    if (redisRes == 'OK') {
      return doc;
    }
    // NX prevented the write: another call already created this record
    // first. Return what's actually persisted, not the one we lost the race
    // to create.
    return await this.readAuth(provider, providerId);
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
   * Search the auth records on a TAG field (id or email). Throws when the search fails.
   * RediSearch TAG queries treat most punctuation as syntax characters, and a backslash
   * in the input can escape the query's own delimiters. Every non-alphanumeric character
   * is escaped (harmless for characters that don't need it): the single pass covers the
   * backslash itself, and legal email characters like '-' and '+' are not a syntax error.
   */
  private async searchTag(field: 'id' | 'email', value: string): Promise<SBAuthSchema[]> {
    const escaped = value.replace(/[^a-zA-Z0-9]/g, '\\$&');
    const response = await this._redisClient.ft.search(this._indexName, `@${field}:{${escaped}}`);
    return response.documents.map((d) => d.value as unknown as SBAuthSchema);
  }

  /**
   * Find the auth record with this id (the id is also the user's document id).
   * Returns undefined when there is none; throws when the search fails or finds several.
   */
  public async findAuthById(id: string): Promise<SBAuthSchema | undefined> {
    const docs = await this.searchTag('id', id);
    if (docs.length > 1) throw new Error('SBAuth> Found multiple auths with the same id');
    return docs[0];
  }

  /**
   * Find the auth records with this email (one person can log in with several providers).
   * Throws when the search fails.
   */
  public async findAuthsByEmail(email: string): Promise<SBAuthSchema[]> {
    return this.searchTag('email', email);
  }

  /**
   * Delete the Auth with this email, when there is exactly one
   * @param email The email to search for
   */
  public async deleteAuthByEmail(email: string): Promise<SBAuthSchema | undefined> {
    try {
      const docs = await this.searchTag('email', email);
      if (docs.length > 1) {
        console.log('SBAuth> Error Found Multiple Auths with the same email');
        return undefined;
      }
      const auth = docs[0];
      if (!auth?.provider || !auth?.providerId) return undefined;
      const result = await this.deleteAuth(auth.provider, auth.providerId);
      if (result) console.log('SBAuth> Auth Deleted', auth.provider, auth.providerId);
      return result ? auth : undefined;
    } catch (error) {
      console.log('SAGEBase> SBAuthDatabase error', error);
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

export const SBAuthDB = new SBAuthDatabase();
