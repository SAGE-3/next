/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { VeoSettings } from './settings';

// VEO can take a while to start a container on a first launch
const VEO_TIMEOUT_MS = 30000;

export type VeoResponse = { status: number; json: unknown };

/**
 * Call VEO's API with this server's credentials (Authorization: Bearer VEO_SECRET).
 * Throws if VEO can't be reached or doesn't answer in time.
 * @param veo The VEO settings
 * @param method HTTP method
 * @param path API path, e.g. /api/vm/any/<uid>
 * @param body JSON body, for POST
 * @param headers Extra headers, e.g. X-Callback-Secret
 */
export async function veoFetch(
  veo: VeoSettings,
  method: 'GET' | 'POST',
  path: string,
  body?: object,
  headers: Record<string, string> = {},
): Promise<VeoResponse> {
  const allHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
  if (veo.secret) {
    allHeaders['Authorization'] = `Bearer ${veo.secret}`;
  }
  const response = await fetch(`${veo.url}${path}`, {
    method,
    headers: allHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(VEO_TIMEOUT_MS),
  });
  const json = await response.json().catch(() => ({ message: `VEO answered ${response.status} without JSON` }));
  return { status: response.status, json };
}
