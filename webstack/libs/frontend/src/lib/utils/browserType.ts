/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

export function getBrowserType(): string {
  const { userAgent } = navigator;
  let type = 'Unknown';
  if (userAgent.includes('Firefox/')) {
    type = 'Firefox';
  } else if (userAgent.includes('Edg/')) {
    type = 'Edge';
  } else if (userAgent.includes('Chrome/')) {
    type = 'Chrome';
  } else if (userAgent.includes('Safari/')) {
    type = 'Safari';
  }
  return type;
}
