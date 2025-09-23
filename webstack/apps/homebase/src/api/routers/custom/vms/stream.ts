/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ClientRequest } from 'http';
import { Request } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { config } from '../../../../config';

/**
 * Route forwarding the vm calls to the co sage container manager
 */
export function VmsStreamRouter() {
  console.log('Vms> router for streams proxied by co sage container manager (stream)', config.vms.streamUrl);

  const router = createProxyMiddleware({
    target: config.vms.streamUrl,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    pathRewrite: { '^/api/vmstream': '/stream' },
    logLevel: 'warn',
    logProvider: () => console,
  });

  return router;
}
