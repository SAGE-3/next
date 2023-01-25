/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { WebSocket } from 'ws';

/**
 * A Subscription cache to keep track of client subscriptions on the server.
 */
export class SubscriptionCache {
  private cache: { [id: string]: (() => Promise<void>)[] };
  private _socket: WebSocket;

  constructor(socket: WebSocket) {
    this.cache = {};
    this._socket = socket;

    this._socket.on('close', () => {
      this.deleteAll();
    });

    this._socket.on('error', () => {
      this.deleteAll();
    });
  }

  public add(subId: string, subs: (() => Promise<void>)[]) {
    this.cache[subId] = subs;
  }

  public async delete(subId: string) {
    if (this.cache[subId]) {
      try {
        await Promise.all(this.cache[subId].map((sub) => sub()));
      } catch (e) {
        console.log('Error>', e);
      }
    }
    delete this.cache[subId];
    return;
  }

  public deleteAll() {
    Object.keys(this.cache).forEach((id) => {
      this.delete(id);
    });
    this.cache = {};
  }
}
