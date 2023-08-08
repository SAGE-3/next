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

import { config } from '../../../config';

/**
 * Route forwarding the fastapi calls to the fastapi server
 */
export function FastAPIRouter() {
  console.log('FastAPI> router for FastAPI', config.fastapi.url);

  const router = createProxyMiddleware({
    target: config.fastapi.url,
    changeOrigin: true,
    pathRewrite: { '^/api/fastapi': '' },
    logLevel: 'warn', // 'debug' | 'info' | 'warn' | 'error' | 'silent'
    logProvider: () => console,
    // request handler making sure the body is parsed before proxying
    onProxyReq: restream,
  });

  return router;
}

/*
 * Restream parsed body before proxying
 *
 * @param {ClientRequest} proxyReq
 * @param {Request} req
 * */
function restream(proxyReq: ClientRequest, req: Request): void {
  if (req.method == 'POST' && req.body) {
    const bodyData = JSON.stringify(req.body);
    // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    // stream the content
    proxyReq.write(bodyData);
  }
}
