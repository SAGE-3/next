/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGE3Collection } from '../generics';
import { WebSocket } from 'ws';
import { PresenceSchema } from '@sage3/shared/types';
import { SBDocument } from '@sage3/sagebase';

/**
 * Class to help with the management of presence of users connected to the server.
 */
export class SAGEPresence {
  private _userId: string;
  private _socket: WebSocket;
  private _collection: SAGE3Collection<PresenceSchema>;

  // Constructor.
  // Sets listeners on socket for disconnects and erros so server can update presenceCollection.
  constructor(userId: string, socket: WebSocket, presenceCollection: SAGE3Collection<PresenceSchema>) {
    this._userId = userId;
    this._socket = socket;
    this._collection = presenceCollection;

    this._socket.on('close', () => {
      console.log(`Presence> ${this._userId} disconnected.`);
      this.setOffline();
    });

    this._socket.on('error', () => {
      console.log(`Presence> ${this._userId} disconnected.`);
      this.setOffline();
    });
  }

  // Due eo the CheckPresnece being an async call,
  // We need async init call since a constructor can not be async.
  public async init() {
    const check = await this.checkPresence();
    if (check) {
      this.setOnline();
    } else {
      this.addPresence();
    }
  }

  // Helper function to set user to 'online'.
  private async setOnline(): Promise<SBDocument<PresenceSchema> | undefined> {
    const res = await this._collection.update(this._userId, this._userId, { status: 'online' });
    return res;
  }

  // Helper function to set user to 'offline'.
  private async setOffline(): Promise<SBDocument<PresenceSchema> | undefined> {
    const res = await this._collection.update(this._userId, this._userId, { status: 'offline' });
    return res;
  }

  // Helper function to add the user's presence to the collection
  private async addPresence(): Promise<boolean> {
    const presence = {
      userId: this._userId,
      status: 'online',
      roomId: '',
      boardId: '',
      cursor: { x: 0, y: 0, z: 0 },
      viewport: {
        position: { x: 0, y: 0, z: 0 },
        size: { width: 0, height: 0, depth: 0 },
      },
    } as PresenceSchema;
    const res = await this._collection.add(presence, this._userId, this._userId);
    return res !== undefined;
  }

  // Check if the user's presence already exists
  private async checkPresence(): Promise<boolean> {
    const check = await this._collection.get(this._userId);
    return check !== null;
  }

  // Remove the doc from the presence collection when the user goes offline
  private async removePresence(): Promise<boolean> {
    const res = await this._collection.delete(this._userId);
    return res !== undefined;
  }
}
