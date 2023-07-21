// Custom Subscription for Presence to throttle the updates to the clients

import { Presence } from '@sage3/shared/types';
import { PresenceCollection } from '../../collections';
import { WebSocket } from 'ws';

// Default tick rate is 15 times per second
const defaultTickRate = 1000 / 15;

class PresenceThrottleClass {
  private _clients: Map<string, WebSocket>;
  private _tickRate: number;
  private _initialized: boolean;

  private _presences: Presence[];

  constructor(tickRate = defaultTickRate) {
    this._clients = new Map();
    this._tickRate = tickRate;
    this._presences = [];
    this._initialized = false;
  }

  async init() {
    const p = await PresenceCollection.getAll();
    if (p) {
      this._presences = p;
    }
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
    });
    this._initialized = true;
    setInterval(() => this.sendUpdates(), this._tickRate);
    return;
  }

  addClient(id: string, socket: WebSocket) {
    this._clients.set(id, socket);
    // On Disconnect remove from client list
    socket.on('close', () => {
      this.removeClient(id);
    });
  }

  removeClient(id: string) {
    this._clients.delete(id);
  }

  sendUpdates() {
    if (!this._initialized) return;
    this._clients.forEach((client, key) => {
      const msg = { id: key, event: { doc: this._presences } };
      client.send(JSON.stringify(msg));
    });
  }
}

export const PresenceThrottle = new PresenceThrottleClass();
