/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGE3Collection } from '../generics';
import { WebSocket } from 'ws';
import { PresenceSchema } from '@sage3/shared/types';
import { createClient, RedisClientType } from 'redis';
import { genId } from '@sage3/shared';

// REDIS class to sync presence across multiple node-server replicas
class RedisPresence {
  private _redisClient!: RedisClientType;
  private _path!: string;
  private _collection!: SAGE3Collection<PresenceSchema>;

  async init(redisUrl: string, prefix: string, presenceCollection: SAGE3Collection<PresenceSchema>) {
    this._redisClient = createClient({ url: redisUrl });
    this._path = `${prefix}:SOCKET:PRESENCE`;
    this._collection = presenceCollection;
    await this._redisClient.connect();

    // Set interval to check all users
    setInterval(() => this.AllUserCheck(), 30);
  }

  // Go over all presence collection and find everyone that is online.
  // Check they are online by going over the redis socket connections and ensure that user is online
  private async AllUserCheck() {
    const usersOnline = await this._collection.query('status', 'online');
    if (!usersOnline) return;
    // Get all userIds
    const uids = usersOnline.map((el) => el.data.userId);
    uids.forEach((uid) => this.checkAndUpdate(uid));
  }

  // Add a socket connection by a user to the database
  public async addSocket(socketId: string, uid: string) {
    // Add a socket to the redis path `THIS.PATH:SOCKETID:UID with a TTL of 30 secs
    this._redisClient.set(`${this._path}:${socketId}:${uid}`, 1, { EX: 30 });
    // Update the presence collection with the new socket
    // Check if the user is already in the presence collection
    const check = await this._collection.get(uid);
    if (!check) {
      // If not, add the user to the presence collection
      const presence = {
        userId: uid,
        status: 'online',
        roomId: '',
        boardId: '',
        cursor: { x: 0, y: 0, z: 0 },
        viewport: {
          position: { x: 0, y: 0, z: 0 },
          size: { width: 0, height: 0, depth: 0 },
        },
      } as PresenceSchema;
      await this._collection.add(presence, uid, uid);
    } else {
      // If the user is already in the presence collection, update the status to online
      await this._collection.update(uid, uid, { status: 'online' });
    }
  }

  // Refresh the socket TTL
  public async refreshSocket(socketId: string, uid: string) {
    // Refresh the TTL of the socket
    this._redisClient.expire(`${this._path}:${socketId}:${uid}`, 30);
  }

  public async removeSocket(socketId: string, uid: string) {
    // Remove the socket from the redis path
    this._redisClient.del(`${this._path}:${socketId}:${uid}`);
  }

  // Check if the user is online. If not, set them offline
  private async checkAndUpdate(uid: string) {
    const online = await this.checkUser(uid);
    if (!online) {
      await this._collection.update(uid, uid, { status: 'offline' });
    }
  }

  // Is this user connected on any of the server replicas?
  private async checkUser(uid: string) {
    // Check if the user is still connected. the path is SAGE3:SOCKET:PRESENCE:SOCKETID:UID
    const sockets = await this._redisClient.keys(`${this._path}:*:${uid}`);
    return sockets.length > 0;
  }
}

export const redisPresence = new RedisPresence();

/**
 * Class to help with the management of presence of users connected to the server.
 */
export class SAGEPresence {
  private _userId: string;
  private _socketId: string;
  private _socket: WebSocket;

  // Constructor.
  // Sets listeners on socket for disconnects and erros so server can update presenceCollection.
  constructor(userId: string, socket: WebSocket) {
    this._userId = userId;
    this._socket = socket;

    this._socketId = genId();

    redisPresence.addSocket(this._socketId, this._userId);

    // Refresh Key every 15 seconds
    setInterval(() => {
      redisPresence.refreshSocket(this._socketId, this._userId);
    }, 15 * 1000);

    this._socket.on('close', () => {
      console.log(`Presence> ${this._userId} disconnected.`);
      redisPresence.removeSocket(this._socketId, this._userId);
    });

    this._socket.on('error', () => {
      console.log(`Presence> ${this._userId} disconnected.`);
      redisPresence.removeSocket(this._socketId, this._userId);
    });
  }
}
