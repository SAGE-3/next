import { ClientRequest } from 'http';
import { Request } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../../../config';

import * as express from 'express';
import * as fs from 'fs';

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

import * as path from 'path';
async function writeToFile(filename: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create the directory path
    const dirPath = path.join(__dirname, 'articulatelogs');

    // Ensure the directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Create the full file path
    const filePath = path.join(dirPath, filename + '.json');

    fs.writeFile(filePath, data, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        reject(err);
      } else {
        console.log('File has been written');
        resolve();
      }
    });
  });
}

/**
 * Route for clients to get the SERVER time
 * @returns
 */
export function ArticulateLogRouter(): express.Router {
  const router = express.Router();
  router.post('/', async ({ body }, res) => {
    // Get Body
    const message = body.message;
    const name = body.name;

    // Save to file
    await writeToFile(name, message);

    console.log('ArticulateLog> Wrote log to file', name);
    res.send(200);
  });

  return router;
}
