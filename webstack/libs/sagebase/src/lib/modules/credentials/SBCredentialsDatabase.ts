/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType, SchemaFieldTypes } from 'redis';
import { v4 } from 'uuid';

import {
  CredentialType,
  CredentialValue,
  deriveEncryptionKey,
  encryptCredentialValue,
  decryptCredentialValue,
} from './credentialCrypto';

export type SBCredentialSchema = {
  id: string;
  ownerId: string;
  name: string;
  type: CredentialType;
  encryptedValue: string;
  createdAt: number;
  updatedAt: number;
};

// What list/create/update return to the client — no encryptedValue, ever.
export type SBCredentialMetadata = Omit<SBCredentialSchema, 'encryptedValue'>;

function toMetadata(doc: SBCredentialSchema): SBCredentialMetadata {
  const { encryptedValue: _omitted, ...metadata } = doc;
  return metadata;
}

// RediSearch TAG queries treat '@', '.', '-', and '+' as syntax characters
// inside {...} — ownerId is always a v4 UUID (hyphens) and name is
// user-chosen (could contain any of these). Confirmed against real Redis
// Stack this session (SBAuthDatabase.deleteAuthByEmail hit the same issue).
function escapeTagValue(value: string): string {
  return value.replace(/[@.\-+]/g, '\\$&');
}

class SBCredentialsDatabase {
  private _redisClient!: RedisClientType;
  private _prefix!: string;
  private _indexName!: string;
  private _encryptionKey!: Buffer;

  public async init(redisClient: RedisClientType, prefix: string, encryptionKey: string): Promise<void> {
    this._redisClient = redisClient.duplicate();
    await this._redisClient.connect();

    this._prefix = prefix + ':CREDENTIALS';
    // Derived from the prefix, not a fixed constant — two SBCredentialsDatabase
    // instances against the same Redis with different prefixes (as happens
    // whenever more than one test file initializes its own instance) would
    // otherwise silently share and clobber one index, causing real,
    // non-deterministic "Index already exists" / cross-instance query
    // flakiness when their test runs overlap.
    this._indexName = `idx:${prefix}:credentials`;
    this._encryptionKey = deriveEncryptionKey(encryptionKey);
    await this.createIndex();
  }

  private async createIndex(): Promise<void> {
    try {
      await this._redisClient.ft.dropIndex(this._indexName);
    } catch (error) {
      console.log('SBCredentials> Index does not exist yet, creating it now.');
    }
    await this._redisClient.ft.create(
      this._indexName,
      {
        '$.ownerId': { type: SchemaFieldTypes.TAG, AS: 'ownerId' },
        '$.type': { type: SchemaFieldTypes.TAG, AS: 'type' },
        '$.name': { type: SchemaFieldTypes.TAG, AS: 'name' },
      },
      {
        ON: 'JSON',
        PREFIX: this._prefix,
      }
    );
  }

  private async findByOwnerTypeName(ownerId: string, type: CredentialType, name: string): Promise<SBCredentialSchema | undefined> {
    const query = `@ownerId:{${escapeTagValue(ownerId)}} @type:{${escapeTagValue(type)}} @name:{${escapeTagValue(name)}}`;
    const response = await this._redisClient.ft.search(this._indexName, query);
    if (response.documents.length === 0) return undefined;
    return response.documents[0].value as unknown as SBCredentialSchema;
  }

  private async readById(id: string): Promise<SBCredentialSchema | undefined> {
    const response = await this._redisClient.json.get(`${this._prefix}:${id}`);
    return (response as SBCredentialSchema) ?? undefined;
  }

  /**
   * Creates a new credential, or — if one already exists for this
   * (ownerId, type, name) — updates its value in place, keeping the same id.
   * A benign, accepted race exists if two requests for the same brand-new
   * (ownerId, type, name) land concurrently (each would create a separate
   * document); this is a rare, low-stakes case (a user double-submitting a
   * form), not worth a distributed lock for.
   */
  public async createOrUpdate(
    ownerId: string,
    type: CredentialType,
    name: string,
    value: CredentialValue
  ): Promise<SBCredentialMetadata> {
    const existing = await this.findByOwnerTypeName(ownerId, type, name);
    const now = Date.now();
    const encryptedValue = encryptCredentialValue(this._encryptionKey, value);

    if (existing) {
      const updated: SBCredentialSchema = { ...existing, encryptedValue, updatedAt: now };
      await this._redisClient.json.set(`${this._prefix}:${existing.id}`, '.', updated);
      return toMetadata(updated);
    }

    const doc: SBCredentialSchema = {
      id: v4(),
      ownerId,
      name,
      type,
      encryptedValue,
      createdAt: now,
      updatedAt: now,
    };
    await this._redisClient.json.set(`${this._prefix}:${doc.id}`, '.', doc);
    return toMetadata(doc);
  }

  public async updateValue(id: string, ownerId: string, value: CredentialValue): Promise<SBCredentialMetadata | undefined> {
    const existing = await this.readById(id);
    if (!existing || existing.ownerId !== ownerId) return undefined;

    const updated: SBCredentialSchema = {
      ...existing,
      encryptedValue: encryptCredentialValue(this._encryptionKey, value),
      updatedAt: Date.now(),
    };
    await this._redisClient.json.set(`${this._prefix}:${id}`, '.', updated);
    return toMetadata(updated);
  }

  public async list(ownerId: string, type?: CredentialType): Promise<SBCredentialMetadata[]> {
    const query = type
      ? `@ownerId:{${escapeTagValue(ownerId)}} @type:{${escapeTagValue(type)}}`
      : `@ownerId:{${escapeTagValue(ownerId)}}`;
    const response = await this._redisClient.ft.search(this._indexName, query);
    return response.documents.map((doc) => toMetadata(doc.value as unknown as SBCredentialSchema));
  }

  public async delete(id: string, ownerId: string): Promise<boolean> {
    const existing = await this.readById(id);
    if (!existing || existing.ownerId !== ownerId) return false;
    const response = await this._redisClient.json.del(`${this._prefix}:${id}`);
    return response > 0;
  }

  /**
   * Internal-only: decrypts and returns the plaintext value. There is no
   * REST route that exposes this — only first-party integration handlers
   * (see e.g. the ctfd integration) may call it.
   */
  public async getDecryptedValue(id: string, ownerId: string): Promise<CredentialValue | undefined> {
    const existing = await this.readById(id);
    if (!existing || existing.ownerId !== ownerId) return undefined;
    return decryptCredentialValue(this._encryptionKey, existing.encryptedValue);
  }
}

export { SBCredentialsDatabase };
export const SBCredentialsDB = new SBCredentialsDatabase();
