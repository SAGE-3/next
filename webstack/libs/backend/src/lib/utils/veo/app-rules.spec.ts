/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { buildVeoLaunchBody, isVeoApp, parseVeoState, sanitizeVeoUrls, MAX_LAST_IMAGE_LENGTH, MAX_URLS } from './app-rules';

const CALLBACK_URL = 'http://homebase:3333/api/veo/callback';
const IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

describe('isVeoApp', () => {
  it('knows which app types run on VEO', () => {
    expect(isVeoApp('CoBrowser')).toBe(true);
    expect(isVeoApp('Stickie')).toBe(false);
    expect(isVeoApp('constructor')).toBe(false);
  });
});

describe('sanitizeVeoUrls', () => {
  it('keeps http(s) URLs, normalized', () => {
    expect(sanitizeVeoUrls(['https://example.com', 'http://a.org/x?y=1'])).toEqual(['https://example.com/', 'http://a.org/x?y=1']);
  });

  it('drops other schemes, bad URLs and non-strings', () => {
    expect(sanitizeVeoUrls(['about:blank', '', 'javascript:alert(1)', 'file:///etc/passwd', 'not a url', 42, null])).toEqual([]);
    expect(sanitizeVeoUrls('https://example.com')).toEqual([]);
  });

  it('encodes the characters app.sh splits on or strips', () => {
    expect(sanitizeVeoUrls(["https://a.org/x,y?q='1'&r=[2]"])).toEqual(['https://a.org/x%2Cy?q=%271%27&r=%5B2%5D']);
  });

  it('caps the number and length of URLs', () => {
    const many = Array.from({ length: MAX_URLS + 5 }, (_, i) => `https://example.com/${i}`);
    expect(sanitizeVeoUrls(many)).toHaveLength(MAX_URLS);
    expect(sanitizeVeoUrls(['https://example.com/' + 'a'.repeat(5000)])).toEqual([]);
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

  it('only lets the three theme numbers through, since app.sh writes it into vnc.cfg', () => {
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_THEME: 2 })?.env).toEqual({ FIREFOX_THEME: 2 });
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_THEME: '0); evil(); //' })?.env).toEqual({});
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_THEME: 3 })?.env).toEqual({});
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_THEME: { a: 1 } })?.env).toEqual({});
    expect(buildVeoLaunchBody('CoBrowser', 'not-an-object')?.env).toEqual({});
  });

  it('sends the tabs as the comma-separated FIREFOX_URLS app.sh splits', () => {
    const body = buildVeoLaunchBody('CoBrowser', { FIREFOX_URLS: ['https://a.org', 'about:blank', 'https://b.org/x,y'] });
    expect(body?.env['FIREFOX_URLS']).toBe('https://a.org/,https://b.org/x%2Cy');
  });

  it('sends no FIREFOX_URLS when no tab survives', () => {
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_URLS: [] })?.env).toEqual({});
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_URLS: 'https://a.org' })?.env).toEqual({});
    expect(buildVeoLaunchBody('CoBrowser', { FIREFOX_URLS: undefined })?.env).toEqual({});
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

  it('accepts the open tabs, keeping only http(s) ones', () => {
    expect(parseVeoState({ urls: ['https://example.com', 'about:newtab'] })).toEqual({
      ok: true,
      state: { urls: ['https://example.com/'] },
    });
  });

  it('does not store a tab list with no http(s) tab (Firefox reports [""] at startup)', () => {
    expect(parseVeoState({ urls: [''] })).toEqual({ ok: true, state: {} });
    expect(parseVeoState({ urls: ['about:blank'] })).toEqual({ ok: true, state: {} });
  });

  it('ignores unknown keys, including ones that are real app state', () => {
    expect(parseVeoState({ nonOwnerViewOnly: false, init: false })).toEqual({ ok: true, state: {} });
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

  it('rejects urls that are not an array', () => {
    expect(parseVeoState({ urls: 'https://example.com' }).ok).toBe(false);
  });

  it('rejects bodies that are not objects', () => {
    expect(parseVeoState(null).ok).toBe(false);
    expect(parseVeoState([IMAGE]).ok).toBe(false);
    expect(parseVeoState('lastImage').ok).toBe(false);
  });
});
