/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType } from 'redis';

import { SBCollectionRef } from './SBCollection';
export { SBCollectionRef };
import { SBJSON } from './SBDocument';
import { SBLogConfig } from '../logger/SBLogger';
export type { SBDocumentRef, SBDocument, SBJSON, SBPrimitive, SBDocumentUpdate, SBDocumentMessage } from './SBDocument';

/**
 * The SBDatabase instance.
 */
export class SBDatabase {
  private _redisClient!: RedisClientType;
  private _logconfig!: SBLogConfig;

  private prefix!: string;

  public async init(redisclient: RedisClientType, prefix: string): Promise<SBDatabase> {
    this._redisClient = redisclient.duplicate();

    this.prefix = `${prefix}:DB`;

    await this._redisClient.connect();
    return this;
  }

  public async collection<Type extends SBJSON>(
    collectionName: string,
    queryProps?: Partial<Type>,
    ttl = -1
  ): Promise<SBCollectionRef<Type>> {
    const path = `${this.prefix}:${collectionName}`;
    const collection = new SBCollectionRef<Type>(collectionName, path, this._redisClient, ttl);
    if (queryProps) {
      await collection.createQueryIndex(queryProps);
    }
    return collection;
  }

  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBDatabase ERROR> ', error);
  }
}
