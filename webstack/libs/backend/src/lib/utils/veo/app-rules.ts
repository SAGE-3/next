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

// SAGE3 app type -> VEO container, and the env vars the browser may set on it
const VEO_APPS: Record<string, { vm: string; env: string[] }> = {
  CoBrowser: { vm: 'firefox-audio', env: ['FIREFOX_THEME'] },
};

// Largest screenshot accepted from a state callback (characters of data URL)
export const MAX_LAST_IMAGE_LENGTH = 10 * 1024 * 1024;

const DATA_IMAGE_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export type VeoEnvValue = string | number | boolean;
export type VeoLaunchBody = { vm: string; env: Record<string, VeoEnvValue> };
export type VeoState = { lastImage?: string };
export type VeoStateResult = { ok: true; state: VeoState } | { ok: false; reason: string };

/**
 * Whether apps of this type run on VEO
 */
export function isVeoApp(appType: string): boolean {
  return Object.prototype.hasOwnProperty.call(VEO_APPS, appType);
}

/**
 * Build the body of a VEO /api/vm/any launch for an app.
 * @param appType The SAGE3 app type
 * @param requestedEnv The env the browser asked for; only the app's allowed keys are kept
 * @param callbackUrl Base URL VEO relays callbacks to (it appends /<uid>); omit to register none
 * @returns The launch body, or undefined if the app type doesn't run on VEO
 */
export function buildVeoLaunchBody(appType: string, requestedEnv: unknown, callbackUrl?: string): VeoLaunchBody | undefined {
  if (!isVeoApp(appType)) return undefined;
  const rule = VEO_APPS[appType];

  const env: Record<string, VeoEnvValue> = {};
  if (requestedEnv && typeof requestedEnv === 'object') {
    for (const key of rule.env) {
      const value = (requestedEnv as Record<string, unknown>)[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
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
 * Unknown keys (e.g. Firefox tab `urls`) are ignored, as the VEO contract asks.
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
  return { ok: true, state };
}
