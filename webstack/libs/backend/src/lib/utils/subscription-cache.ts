/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * A Subscription cache to keep track of client subscriptions on the server.
 */
export class SubscriptionCache {
  private cache: { [id: string]: () => Promise<void> }

  constructor() {
    this.cache = {};
  }

  public add(subId: string, sub: () => Promise<void>) {
    this.cache[subId] = sub;
  }

  public delete(subId: string) {
    if (this.cache[subId]) {
      try {
        this.cache[subId]();
      } catch (e) {
        console.log(e);
      }
    }
    delete this.cache[subId];
  }

  public deleteAll() {
    Object.keys(this.cache).forEach(id => {
      this.delete(id);
    })
    this.cache = {};
  }
}



