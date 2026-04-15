/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * HTTP client for the VEO container orchestration API.
 * VEO manages per-app Docker containers (e.g. Firefox with audio) keyed by SAGE3 app ID.
 */
export class ContainerAPI {
  /**
   * Start a container for the given app (or return its WS URL if already running).
   * Returns `{ url: string }` on success.
   */
  static async init(baseUrl: string, appId: string, container: string, enviromentVariable: {}) {
    const payload = {
      vm: container,
      env: enviromentVariable,
    };

    return await fetch(`${baseUrl}/api/vm/any/${appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((json) => json);
  }

  /**
   * Check if a container is already running and return its WS URL.
   * Returns `{ url: string }` if running, otherwise an error object.
   */
  static async check(baseUrl: string, appId: string) {
    return await fetch(`${baseUrl}/api/vm/ws/${appId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((json) => json);
  }
}
