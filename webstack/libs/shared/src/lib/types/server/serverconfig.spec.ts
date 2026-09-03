/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { getScreenshareBackend, isLiveKitEnabled, isTwilioEnabled, ServerConfiguration } from './serverconfig';

// Only the screenshare-related services matter here
type Services = ServerConfiguration['services'];

const livekit = { apiSecret: 'a-secret-of-at-least-32-characters-xx' };
const twilio = { accountSid: 'AC123', apiKey: 'SK123', apiSecret: 'twilio-secret' };

const services = (partial: Partial<Services>) => partial as Services;

describe('screenshare backend selection', () => {
  it('is livekit when only LiveKit is configured', () => {
    expect(getScreenshareBackend(services({ livekit }))).toBe('livekit');
  });

  it('is twilio when only Twilio is configured', () => {
    expect(getScreenshareBackend(services({ twilio }))).toBe('twilio');
  });

  it('prefers livekit when both are configured', () => {
    expect(getScreenshareBackend(services({ livekit, twilio }))).toBe('livekit');
  });

  it('is none when neither is configured', () => {
    expect(getScreenshareBackend(services({}))).toBe('none');
  });

  it('treats empty credentials as not configured', () => {
    const empty = services({
      livekit: { apiSecret: '' },
      twilio: { accountSid: '', apiKey: '', apiSecret: '' },
    });
    expect(getScreenshareBackend(empty)).toBe('none');
  });
});

describe('isLiveKitEnabled', () => {
  it('depends on the secret, which is the only value there is', () => {
    expect(isLiveKitEnabled(services({ livekit: { apiSecret: 'x'.repeat(32) } }))).toBe(true);
    expect(isLiveKitEnabled(services({ livekit: {} }))).toBe(false);
  });

  it('is false when the livekit block is absent', () => {
    expect(isLiveKitEnabled(services({}))).toBe(false);
  });
});

describe('isTwilioEnabled', () => {
  it('requires all three console values', () => {
    expect(isTwilioEnabled(services({ twilio }))).toBe(true);
    expect(isTwilioEnabled(services({ twilio: { ...twilio, accountSid: '' } }))).toBe(false);
    expect(isTwilioEnabled(services({ twilio: { ...twilio, apiKey: '' } }))).toBe(false);
    expect(isTwilioEnabled(services({ twilio: { ...twilio, apiSecret: '' } }))).toBe(false);
  });
});
