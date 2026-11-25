/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * The generic WebSocket routes ask the collection's checkWrite before every write,
 * with the document id the route is about to use (not another part of the route).
 */

import { WebSocket } from 'ws';

import { SBAuthSchema } from '@sage3/sagebase';
import { APIClientWSMessage } from '@sage3/shared/types';

import { SubscriptionCache } from '../utils/subscription-cache';
import { CollectionWrite, SAGE3Collection } from './SAGECollection';
import { sageWSRouter } from './SAGEWSRouter';

type Doc = { name: string };

// A collection with the rule of the users collection: update only your own document, nothing else.
// The database calls are replaced: the test records which writes got through.
class OwnDocOnly extends SAGE3Collection<Doc> {
  public written: string[] = [];
  constructor() {
    super('USERS', { name: '' });
  }
  public override checkWrite(write: CollectionWrite, auth: SBAuthSchema): string | undefined {
    if (write.action !== 'update') return 'Not allowed';
    return write.id === auth.id ? undefined : 'Not your document';
  }
  public override async add(): Promise<any> {
    this.written.push('add');
    return {};
  }
  public override async addBatch(): Promise<any> {
    this.written.push('addBatch');
    return [];
  }
  public override async update(id: string): Promise<any> {
    this.written.push('update ' + id);
    return {};
  }
  public override async updateBatch(updates: { id: string }[]): Promise<any> {
    this.written.push('updateBatch ' + updates.map((u) => u.id).join(','));
    return [];
  }
  public override async delete(id: string): Promise<any> {
    this.written.push('delete ' + id);
    return {};
  }
  public override async deleteBatch(ids: string[]): Promise<any> {
    this.written.push('deleteBatch ' + ids.join(','));
    return [];
  }
}

const me: SBAuthSchema = { provider: 'google', providerId: 'g-1', id: 'me' };

async function send(method: string, route: string, body?: unknown) {
  const collection = new OwnDocOnly();
  const replies: { success: boolean; message?: string }[] = [];
  const socket = { send: (text: string) => replies.push(JSON.parse(text)) } as unknown as WebSocket;
  const message = { id: 'm1', method, route, body } as unknown as APIClientWSMessage;
  await sageWSRouter(collection, socket, message, me, {} as SubscriptionCache);
  return { written: collection.written, reply: replies[0] };
}

describe('sageWSRouter — collection write check', () => {
  it('allows an update of the own document', async () => {
    const { written, reply } = await send('PUT', '/api/users/me', { name: 'x' });
    expect(written).toEqual(['update me']);
    expect(reply.success).toBe(true);
  });

  it('refuses an update of another document', async () => {
    const { written, reply } = await send('PUT', '/api/users/victim', { name: 'x' });
    expect(written).toEqual([]);
    expect(reply).toMatchObject({ success: false, message: 'Not your document' });
  });

  it('checks the id the route updates (the last part), not an earlier part of the route', async () => {
    for (const route of ['/api/users/me/victim', '/api/users/me?/victim', '/me/users/victim']) {
      const { written, reply } = await send('PUT', route, { name: 'x' });
      expect(written).toEqual([]);
      expect(reply.success).toBe(false);
    }
  });

  it('checks every document of a batch update', async () => {
    const batch = [
      { id: 'me', updates: { name: 'x' } },
      { id: 'victim', updates: { name: 'x' } },
    ];
    const { written, reply } = await send('PUT', '/api/users', { batch });
    expect(written).toEqual([]);
    expect(reply.success).toBe(false);
  });

  it('refuses a batch that is not a list', async () => {
    const { written, reply } = await send('PUT', '/api/users', { batch: 'me' });
    expect(written).toEqual([]);
    expect(reply.success).toBe(false);
  });

  it('checks creations on any route, single or batch', async () => {
    for (const body of [{ name: 'x' }, { batch: [{ name: 'x' }] }]) {
      const { written, reply } = await send('POST', '/api/users/create', body);
      expect(written).toEqual([]);
      expect(reply).toMatchObject({ success: false, message: 'Not allowed' });
    }
  });

  it('checks deletions, single or batch', async () => {
    const single = await send('DELETE', '/api/users/me');
    const batch = await send('DELETE', '/api/users', { batch: ['me'] });
    expect(single.written).toEqual([]);
    expect(batch.written).toEqual([]);
    expect(single.reply.success).toBe(false);
    expect(batch.reply.success).toBe(false);
  });
});
