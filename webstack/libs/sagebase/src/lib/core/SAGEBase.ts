/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { createClient, RedisClientOptions, RedisClientType, RedisModules } from 'redis';
import { Express } from 'express';

// SAGEBase Module Imports
import { SBDatabase, SBPubSub } from '../modules';
import { SBAuth, SBAuthConfig } from '../modules/auth/SBAuth';

export type SAGEBaseConfig = {
  redisUrl?: string;
  projectName: string;
  authConfig?: SBAuthConfig;
}

// The core SAGEBase class that allows access to the various modules. (Database, PubSub, Auth...etc)
class SAGEBaseCore {

  private _client!: RedisClientType;
  private _redisPrefix!: string;
  private _redisUrl!: string;

  // SAGEBase modules
  private _database!: SBDatabase;
  private _pubsub!: SBPubSub;
  private _auth!: SBAuth;

  public async init(config: SAGEBaseConfig, express?: Express) {

    // Config options for the Redis CreateClient
    const redisClientConfig = {} as RedisClientOptions<RedisModules, Record<string, never>>;

    // PREFIX for keys/channels in REDIS
    // ex. $PROJECTNAME:$COLLECTION:$DOCID
    if (config.redisUrl) {
      this._redisUrl = config.redisUrl;
      redisClientConfig.url = this._redisUrl;
    }

    // SAGEBase prefix stuff for Redis keys
    this._redisPrefix = `${config.projectName}`

    // Create the Redis Client and connect
    this._client = createClient(redisClientConfig);
    await this._client.connect();

    // Init the SAGEBase Database
    this._database = new SBDatabase();
    await this._database.init(this._client, this._redisPrefix);

    // Init the SAGEBase PubSub
    this._pubsub = new SBPubSub();
    await this._pubsub.init(this._client, this._redisPrefix);

    // Init the SAGEBase Auth
    if (config.authConfig && express) {
      this._auth = new SBAuth();
      await this._auth.init(this._client, this._redisPrefix, config.authConfig, express);
    }

  }

  /**
   * Getter for the SAGEBase Database Module Instance
   * @returns {SBDatabase} The SAGEBase Database Instance
   */
  public get Database(): SBDatabase {
    return this._database;
  }

  /**
   * Getter for the SAGEBase Pubsub Module Instance
   * @returns {SBPubSub} The SAGEBase PubSub Module Instance
   */
  public get PubSub(): SBPubSub {
    return this._pubsub;
  }

  /**
   * Getter for SAGEBase Auth Module Instance
   * @return {SBAuth} The SAGEBase Auth Module Instance
   */
  public get Auth(): SBAuth {
    return this._auth;
  }

}

export const SAGEBase = new SAGEBaseCore();
export * from '../modules';