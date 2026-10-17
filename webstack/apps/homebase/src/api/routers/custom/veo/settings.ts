/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { config } from '../../../../config';

/**
 * Everything the VEO routes need, resolved in one place, from the hjson `veoServer` block.
 * The two secrets can also come from the environment (VEO_SECRET, VEO_CALLBACK_KEY),
 * which wins when set, e.g. from deployment/.env in docker. Browsers only ever get `url`.
 */
export type VeoSettings = {
  // VEO's origin, e.g. https://veo.example.org (also used by browsers for the stream)
  url: string;
  // Base URL VEO's API container uses to reach this server's callback routes
  callbackUrl: string;
  // VEO_SECRET: sent as a Bearer token on every call to VEO. Empty = VEO runs without auth
  secret: string;
  // VEO_CALLBACK_KEY: HMAC key for the per-app callback secrets. Empty = callbacks disabled
  callbackKey: string;
};

export function veoSettings(): VeoSettings {
  return {
    url: (config.veoServer?.url || '').replace(/\/+$/, ''),
    callbackUrl: config.veoServer?.callbackUrl || '',
    secret: process.env.VEO_SECRET || config.veoServer?.secret || '',
    callbackKey: process.env.VEO_CALLBACK_KEY || config.veoServer?.callbackKey || '',
  };
}

/**
 * Callbacks need both the key to sign them and a URL VEO can reach
 */
export function veoCallbacksEnabled(veo: VeoSettings): boolean {
  return veo.callbackKey !== '' && veo.callbackUrl !== '';
}
