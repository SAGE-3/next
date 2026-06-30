/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '../config';

export async function serverTime(): Promise<{ epoch: number }> {
  const response = await fetch(apiUrls.misc.getTime);
  const time = await response.json();
  return time;
}

// Cached offset: serverEpoch - Date.now(), computed once on first call.
// Subsequent calls use Date.now() + offset (no HTTP request).
let _clockOffset: number | null = null;

export async function initClockOffset(): Promise<void> {
  const before = Date.now();
  const { epoch } = await serverTime();
  const after = Date.now();
  // Use midpoint of the request to reduce one-way latency error
  _clockOffset = epoch - Math.round((before + after) / 2);
}

/**
 * Returns current server epoch (ms) using a cached clock offset.
 * Falls back to a live fetch if the offset has not been initialised yet.
 */
export async function localServerEpoch(): Promise<number> {
  if (_clockOffset === null) {
    await initClockOffset();
  }
  return Date.now() + (_clockOffset as number);
}

/**
 * Synchronous read of the cached clock offset (ms).
 * Returns 0 if initClockOffset has not completed yet.
 * Use after localServerEpoch() has been called at least once.
 */
export function clockOffsetMs(): number {
  return _clockOffset ?? 0;
}
