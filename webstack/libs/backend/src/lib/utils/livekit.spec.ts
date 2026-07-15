/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { generateLiveKitToken } from './livekit';
import { LiveKitConfiguration } from '@sage3/shared/types';

const config: LiveKitConfiguration = {
  url: 'ws://localhost:7880',
  apiKey: 'testkey',
  apiSecret: 'a-test-secret-of-at-least-32-characters!',
};

// Decode a JWT payload without verifying the signature
function decodePayload(jwt: string): Record<string, any> {
  const payload = jwt.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

describe('generateLiveKitToken', () => {
  it('mints a JWT for the given identity and room', async () => {
    const token = await generateLiveKitToken(config, 'user-1--tab-1', 'board-1');
    const payload = decodePayload(token);
    expect(payload.sub).toBe('user-1--tab-1');
    expect(payload.iss).toBe('testkey');
    expect(payload.video.roomJoin).toBe(true);
    expect(payload.video.room).toBe('board-1');
  });

  it('grants publish and subscribe', async () => {
    const token = await generateLiveKitToken(config, 'user-1--tab-1', 'board-1');
    const payload = decodePayload(token);
    expect(payload.video.canPublish).toBe(true);
    expect(payload.video.canSubscribe).toBe(true);
  });

  it('scopes the grant to a single room', async () => {
    const token = await generateLiveKitToken(config, 'user-1--tab-1', 'board-1');
    const payload = decodePayload(token);
    expect(payload.video.roomCreate).toBeFalsy();
    expect(payload.video.roomAdmin).toBeFalsy();
    expect(payload.video.room).toBe('board-1');
  });

  it('tokens expire', async () => {
    const token = await generateLiveKitToken(config, 'user-1--tab-1', 'board-1');
    const payload = decodePayload(token);
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp * 1000).toBeGreaterThan(Date.now());
  });
});
