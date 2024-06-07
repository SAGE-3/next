import { ClientRequest } from 'http';
import { Request } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../../../config';

/**
 * Route forwarding the Articulate calls to the Articulate server
 */
export function ArticulateRouter() {
  console.log('Articulate> router for Articulate', config.articulate.url);

  const router = createProxyMiddleware({
    target: config.articulate.url,
    changeOrigin: true,
    pathRewrite: { '^/api/articulate': '' },
    logLevel: 'warn', // 'debug' | 'info' | 'warn' | 'error' | 'silent'
    logProvider: () => console,
    selfHandleResponse: false, // This is now false to allow default handling
    onProxyReq: (proxyReq, req, res) => {
      const contentType = req.headers['content-type'];
      let bodyData;
      if (contentType?.includes('application/json')) {
        bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      } else if (contentType?.includes('multipart/form-data')) {
        // Handle other routes normally
        proxyReq.on('data', (chunk) => {
          res.write(chunk);
        });

        proxyReq.on('end', () => {
          res.end();
        });
      }
    }, // Ensure restream is called on proxy requests
  });

  return router;
}
