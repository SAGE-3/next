/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RedisClientType } from 'redis';

export class SBPubSub {

  private client!: RedisClientType;

  private prefix!: string;

  public async init(redisclient: RedisClientType, prefix: string): Promise<SBPubSub> {

    this.client = redisclient.duplicate();
    await this.client.connect();

    this.prefix = `${prefix}:PUBSUB`;

    return this;
  }

  public async publish(channelName: string, message: string): Promise<number> {
    const redisRes = await this.client.publish(`${this.prefix}:${channelName} `, message);
    return redisRes;
  }

  public async subscribe(channelName: string, callback: (message: string) => void): Promise<() => Promise<void>> {

    // Duplicate RedisClient and connect
    const subscriber = this.client.duplicate();
    await subscriber.connect();

    // Subscribe to channel
    const channel = `${this.prefix}:${channelName} `;
    await subscriber.subscribe(channel, (message: string) => {
      callback(message);
    });

    // Unsubscribe Cleanup
    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.disconnect();
    }
  }

  private ERRORLOG(error: unknown) {
    console.log("SAGEBase SBPubSub ERROR: ", error);
  }

}