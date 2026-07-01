/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import * as express from 'express';
import { Request, Response } from 'express';
import { createProxyServer } from 'http-proxy-3';

import { config } from '../../../config';

// Custom logger to control the logging of the proxy
const logger = {
  info: (...args: any[]) => {
    // console.log('[PROXY][INFO]', ...args);
    return; // Disable info logging for proxy
  },
  warn: (...args: any[]) => {
    console.warn('[Kernels Proxy][WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[Kernels Proxy][ERROR]', ...args);
  },
};

/**
 * Route forwarding the kernels calls to the sage kernels server
 */
export function KernelsRouter() {
  console.log('Kernels> router for sage kernels', config.kernels.url);

  // The router is mounted at /api/kernels, so Express strips that prefix and the
  // proxy forwards req.url (e.g. /execute) onto the target — same effect as the
  // previous pathRewrite of '^/api/kernels' -> ''.
  const router = express.Router();

  const proxy = createProxyServer({
    target: config.kernels.url,
    changeOrigin: true,
    selfHandleResponse: true, // handle the response manually
  });

  // request handler making sure the body is parsed before proxying
  proxy.on('proxyReq', (proxyReq: ClientRequest, req: IncomingMessage) => {
    restream(proxyReq, req as Request);
  });

  // selfHandleResponse: relay the upstream response ourselves
  proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => {
    // Only for SSE routes
    if ((req as Request).path.includes('stream')) {
      res.writeHead(200, {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
      });
      // Relay each chunk as it arrives. Do NOT also buffer and re-write on end,
      // or the client receives the whole stream twice (duplicated SSE output).
      proxyRes.on('data', (chunk) => {
        res.write(chunk);
      });

      proxyRes.on('end', () => {
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
  });

  proxy.on('error', (err: Error, _req: IncomingMessage, res: ServerResponse | Socket) => {
    logger.error(err);
    // Errors can come from HTTP proxying (ServerResponse) or a ws upgrade (Socket)
    if (res instanceof ServerResponse) {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
    } else {
      res.destroy();
    }
  });

  // http-proxy-3's web() is callback/event-based; failures surface via the
  // 'error' handler above rather than a rejected promise.
  router.use((req: Request, res: Response) => {
    proxy.web(req, res);
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
