/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Which SAGE3 apps run on VEO, and what they may send to and receive from it.
 * The browser never chooses the container or the callback URLs: the server derives
 * them here from the app's type.
 */

export type VeoEnvValue = string | number | boolean;
export type VeoLaunchBody = { vm: string; env: Record<string, VeoEnvValue> };
export type VeoState = { lastImage?: string; urls?: string[] };
export type VeoStateResult = { ok: true; state: VeoState } | { ok: false; reason: string };

// Turns the browser's value for an env var into what the container gets, or undefined to drop it
type VeoEnvRule = (value: unknown) => VeoEnvValue | undefined;

// Largest screenshot accepted from a state callback (characters of data URL)
export const MAX_LAST_IMAGE_LENGTH = 10 * 1024 * 1024;
// Most tabs kept, and longest URL kept, in a CoBrowser's urls
export const MAX_URLS = 20;
export const MAX_URL_LENGTH = 2048;

const DATA_IMAGE_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

// firefox-audio's app.sh strips [ ] ' " from FIREFOX_URLS and splits it on commas,
// so those characters are percent-encoded to keep each URL in one piece
const FIREFOX_URL_UNSAFE = /[,'"[\]]/g;

/**
 * Keep only http(s) URLs, normalized and with app.sh's delimiters encoded, at most MAX_URLS.
 * Anything else (about:blank, file:, javascript:, non-strings) is dropped.
 */
export function sanitizeVeoUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const result: string[] = [];
  for (const url of urls) {
    if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    result.push(parsed.href.replace(FIREFOX_URL_UNSAFE, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()));
    if (result.length === MAX_URLS) break;
  }
  return result;
}

// app.sh writes FIREFOX_THEME unquoted into Firefox's privileged autoconfig (vnc.cfg),
// so only the three theme numbers may pass: 0 dark, 1 light, 2 auto
const firefoxTheme: VeoEnvRule = (value) => (value === 0 || value === 1 || value === 2 ? value : undefined);

// The tabs to open, as the comma-separated list app.sh splits
const firefoxUrls: VeoEnvRule = (value) => {
  const urls = sanitizeVeoUrls(value);
  return urls.length > 0 ? urls.join(',') : undefined;
};

// SAGE3 app type -> VEO container, and the env vars the browser may set on it
const VEO_APPS: Record<string, { vm: string; env: Record<string, VeoEnvRule> }> = {
  CoBrowser: { vm: 'firefox-audio', env: { FIREFOX_THEME: firefoxTheme, FIREFOX_URLS: firefoxUrls } },
};

/**
 * Whether apps of this type run on VEO
 */
export function isVeoApp(appType: string): boolean {
  return Object.prototype.hasOwnProperty.call(VEO_APPS, appType);
}

/**
 * Build the body of a VEO /api/vm/any launch for an app.
 * @param appType The SAGE3 app type
 * @param requestedEnv The env the browser asked for; only the app's allowed keys are kept, after their rule
 * @param callbackUrl Base URL VEO relays callbacks to (it appends /<uid>); omit to register none
 * @returns The launch body, or undefined if the app type doesn't run on VEO
 */
export function buildVeoLaunchBody(appType: string, requestedEnv: unknown, callbackUrl?: string): VeoLaunchBody | undefined {
  if (!isVeoApp(appType)) return undefined;
  const rule = VEO_APPS[appType];

  const env: Record<string, VeoEnvValue> = {};
  if (requestedEnv && typeof requestedEnv === 'object') {
    for (const [key, toEnv] of Object.entries(rule.env)) {
      const value = toEnv((requestedEnv as Record<string, unknown>)[key]);
      if (value !== undefined) {
        env[key] = value;
      }
    }
  }
  // Set last, so the browser can never point the callbacks somewhere else
  if (callbackUrl) {
    const base = callbackUrl.replace(/\/+$/, '');
    env['VEO_CALLBACK_STATE_URL'] = `${base}/state`;
    env['VEO_CALLBACK_FILE_URL'] = `${base}/file`;
  }
  return { vm: rule.vm, env };
}

/**
 * Pick the app state fields out of a VEO state callback body.
 * Unknown keys are ignored, as the VEO contract asks.
 * A known key with a bad value rejects the whole callback.
 */
export function parseVeoState(body: unknown): VeoStateResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object' };
  }
  const state: VeoState = {};

  const lastImage = (body as Record<string, unknown>)['lastImage'];
  if (lastImage !== undefined) {
    if (typeof lastImage !== 'string' || lastImage.length > MAX_LAST_IMAGE_LENGTH || !DATA_IMAGE_URL.test(lastImage)) {
      return { ok: false, reason: 'lastImage must be a png, jpeg or webp base64 data URL' };
    }
    state.lastImage = lastImage;
  }

  // Firefox's open tabs. Only http(s) tabs are kept, and a list with none is not stored:
  // right after launch Firefox reports [""] before it has restored its tabs, which
  // would otherwise wipe the urls the next launch reopens.
  const urls = (body as Record<string, unknown>)['urls'];
  if (urls !== undefined) {
    if (!Array.isArray(urls)) {
      return { ok: false, reason: 'urls must be an array' };
    }
    const kept = sanitizeVeoUrls(urls);
    if (kept.length > 0) {
      state.urls = kept;
    }
  }

  return { ok: true, state };
}
