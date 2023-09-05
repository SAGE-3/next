/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * All the routes for the frontend
 */
export const apiUrls = {
  config: {
    getConfig: '/api/configuration',
  },
  assets: {
    getAssets: '/api/assets',
    getAssetById: (id: string) => `api/assets/static/${id}`,
  },
};
