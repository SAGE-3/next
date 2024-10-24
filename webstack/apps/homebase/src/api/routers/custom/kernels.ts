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
 * Route forwarding the kernels calls to the sage kernels server
 */
export function KernelsRouter() {
  console.log('Kernels> router for sage kernels', config.kernels.url);

  const router = createProxyMiddleware({
    target: config.kernels.url,
    changeOrigin: true,
    pathRewrite: { '^/api/kernels': '' },
    logLevel: 'warn', // 'debug' | 'info' | 'warn' | 'error' | 'silent'
    logProvider: () => console,
    selfHandleResponse: true, // Add this to handle the response manually
    // request handler making sure the body is parsed before proxying
    onProxyReq: restream,
    onProxyRes: (proxyRes, req, res) => {
      let data = '';

      // Only for SSE routes
      if (req.path.includes('stream')) {
        res.writeHead(200, {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Content-Type': 'text/event-stream',
        });
        proxyRes.on('data', (chunk) => {
          data += chunk;
          res.write(chunk);
          res.flush();
        });

        proxyRes.on('end', () => {
          res.write(data);
          res.end();
        });
      } else {
        // Handle other routes normally
        proxyRes.on('data', (chunk) => {
          res.write(chunk);
        });

        proxyRes.on('end', () => {
          res.end();
        });
      }
    },
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
  if (req.method === 'POST' && req.body) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }

  if (req.method === 'GET' && req.path.includes('stream')) {
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Cache-Control', 'no-cache');
    proxyReq.setHeader('Content-Type', 'text/event-stream');
  }
}
