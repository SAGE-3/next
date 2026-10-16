/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { buildVeoLaunchBody, isVeoApp, parseVeoState, MAX_LAST_IMAGE_LENGTH } from './app-rules';

const CALLBACK_URL = 'http://homebase:3333/api/veo/callback';
const IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

describe('isVeoApp', () => {
  it('knows which app types run on VEO', () => {
    expect(isVeoApp('CoBrowser')).toBe(true);
    expect(isVeoApp('Stickie')).toBe(false);
    expect(isVeoApp('constructor')).toBe(false);
  });
});

describe('buildVeoLaunchBody', () => {
  it('picks the container from the app type', () => {
    expect(buildVeoLaunchBody('CoBrowser', {})?.vm).toBe('firefox-audio');
    expect(buildVeoLaunchBody('Stickie', {})).toBeUndefined();
  });

  it('keeps only the env keys the app allows', () => {
    const body = buildVeoLaunchBody('CoBrowser', { FIREFOX_THEME: 1, LD_PRELOAD: '/evil.so', nested: { a: 1 } });
    expect(body?.env).toEqual({ FIREFOX_THEME: 1 });
  });

  it('drops allowed keys with non-primitive values', () => {
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_THEME: { a: 1 } })?.env).toEqual({});
    expect(buildVeoLaunchBody('CoBrowser', 'not-an-object')?.env).toEqual({});
  });

  it('sets the callback URLs from the server, never from the browser', () => {
    const body = buildVeoLaunchBody('CoBrowser', { VEO_CALLBACK_STATE_URL: 'http://attacker/state' }, `${CALLBACK_URL}/`);
    expect(body?.env['VEO_CALLBACK_STATE_URL']).toBe(`${CALLBACK_URL}/state`);
    expect(body?.env['VEO_CALLBACK_FILE_URL']).toBe(`${CALLBACK_URL}/file`);
  });

  it('registers no callbacks without a callback URL', () => {
    const body = buildVeoLaunchBody('CoBrowser', { VEO_CALLBACK_STATE_URL: 'http://attacker/state' });
    expect(body?.env['VEO_CALLBACK_STATE_URL']).toBeUndefined();
  });
});

describe('parseVeoState', () => {
  it('accepts a screenshot', () => {
    expect(parseVeoState({ lastImage: IMAGE })).toEqual({ ok: true, state: { lastImage: IMAGE } });
  });

  it('ignores unknown keys, including ones that are real app state', () => {
    expect(parseVeoState({ urls: ['https://example.com'], nonOwnerViewOnly: false })).toEqual({ ok: true, state: {} });
  });

  it('rejects a lastImage that is not an image data URL', () => {
    expect(parseVeoState({ lastImage: 'https://example.com/a.png' }).ok).toBe(false);
    expect(parseVeoState({ lastImage: 'data:text/html;base64,PGgxPg==' }).ok).toBe(false);
    expect(parseVeoState({ lastImage: 42 }).ok).toBe(false);
  });

  it('rejects an oversized lastImage', () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_LAST_IMAGE_LENGTH);
    expect(parseVeoState({ lastImage: huge }).ok).toBe(false);
  });

  it('rejects bodies that are not objects', () => {
    expect(parseVeoState(null).ok).toBe(false);
    expect(parseVeoState([IMAGE]).ok).toBe(false);
    expect(parseVeoState('lastImage').ok).toBe(false);
  });
});
