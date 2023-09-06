/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Presence } from '@sage3/shared/types';
import { PresenceCollection } from '../../collections';
import { WebSocket } from 'ws';
import { throttle } from 'throttle-debounce';

// Default tick rate is 15 times per second
const defaultTickRate = 1000 / 15;

/**
 * Presence Throttle Class
 * This class is responsible for throttling the presence updates to the clients
 * It will subscribe to the Presence Collection and send updates to all subscribed clients
 * It will also throttle the updates to the clients to a certain tick rate
 * This is to prevent the clients from being overloaded with updates
 */
class PresenceThrottleClass {
  private _subscriptions: Map<string, WebSocket>;
  private _tickRate: number;
  private _initialized: boolean;
  private _presences: Presence[];

  constructor(tickRate = defaultTickRate) {
    this._subscriptions = new Map();
    this._tickRate = tickRate;
    this._presences = [];
    this._initialized = false;
  }

  /**
   * Initialize the Presence Throttle
   */
  async init() {
    const p = await PresenceCollection.getAll();
    if (p) {
      this._presences = p;
    }
    // Throttle Function
    const throttleUpdate = throttle(this._tickRate, () => this.sendUpdates());

    // Subscribe to Presence Collection
    await PresenceCollection.subscribeAll((message) => {
      switch (message.type) {
        case 'CREATE': {
          const docs = message.doc as Presence[];
          this._presences = [...this._presences, ...docs];
          break;
        }
        case 'UPDATE': {
          const docs = message.doc as Presence[];
          const presences = [...this._presences];
          docs.forEach((doc) => {
            const idx = presences.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              // merge the update with current value
              presences[idx] = { ...presences[idx], ...doc };
            }
          });
          this._presences = presences;
          break;
        }
        case 'DELETE': {
          const docs = message.doc as Presence[];
          const ids = docs.map((d) => d._id);
          const presences = [...this._presences];
          const remainingPresences = presences.filter((a) => !ids.includes(a._id));
          this._presences = remainingPresences;
        }
      }
      // Send the updates
      throttleUpdate();
    });

    // Init is done
    this._initialized = true;
    return;
  }

  /**
   * Add a subscription
   * @param id Id of the subscription
   * @param socket The websocket that is subscribed
   */
  addSubscription(id: string, socket: WebSocket) {
    this._subscriptions.set(id, socket);
    // On Disconnect remove from client list
    socket.on('close', () => {
      this.removeClient(id);
    });
  }

  /**
   * Remove a  subscription
   * @param id Id of the subscription
   */
  removeClient(id: string) {
    this._subscriptions.delete(id);
  }

  /**
   * Send updates to all subscribed clients
   */
  sendUpdates(): void {
    if (!this._initialized) return;
    this._subscriptions.forEach((socket, key) => {
      const msg = { id: key, event: { doc: this._presences } };
      socket.send(JSON.stringify(msg));
    });
  }
}

export const PresenceThrottle = new PresenceThrottleClass();
