/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Utility functions for webview app

/**
 * Check if browser is Electron based on the userAgent.
 * @returns {boolean}
 */
export function isElectron(): boolean {
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron');
}

/**
 * Check if given url hostname matches with the current hostname of the client page.
 * @param {string} url, url to check
 * @returns {boolean}
 */
export function isUrlHostnameAndPortSameAsClient(url: string): boolean {
  // Before changing url, check if related to current hostname
  const currentBrowserPageHostname = window.location.hostname;
  const currentBrowserPort = window.location.port;
  let hostnameMatch = false;
  if (url.includes(currentBrowserPageHostname) && url.includes(':' + currentBrowserPort)) {
    hostnameMatch = true;
  }
  return hostnameMatch;
}

/**
 * Check if given url matches with client server board.
 * @param {string} url, url to check
 * @returns {boolean}
 */
export function isUrlMatchingLocalBoard(url: string): boolean {
  const hostnameMatch = isUrlHostnameAndPortSameAsClient(url);
  const boardMarker = '/board/';
  if (hostnameMatch && url.includes(boardMarker)) {
    return true;
  }
  return false;
}

export async function waitForOpenSocket(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (socket.readyState !== socket.OPEN) {
      socket.addEventListener('open', () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}
