/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Check if current platform is mac
 * @returns {boolean} true if mac, false otherwise
 */
export const isMac = () => {
  return window.navigator.userAgent.toLowerCase().includes('macintosh');
};
