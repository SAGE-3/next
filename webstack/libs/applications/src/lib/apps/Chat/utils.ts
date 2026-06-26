/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Short time label (HH:MM) shown next to a message.
export function getDateString(epoch: number): string {
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${time}`;
}
