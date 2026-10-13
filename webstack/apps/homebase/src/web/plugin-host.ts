import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { pluginEntrySchema, pluginPackageDigestSchema } from '@sage3/shared/types';

const querySchema = z
  .object({
    roomId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    digest: pluginPackageDigestSchema,
    entry: pluginEntrySchema,
  })
  .strict();

/** A trusted parent document keeps the untrusted frame's navigation inside its package. */
export function servePluginHost(request: Request, response: Response): void {
  const parsed = querySchema.safeParse(request.query);
  const authority = request.get('host');
  if (!parsed.success || !authority || !/^(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::[0-9]+)?$/.test(authority)) {
    response.status(400).send('Invalid extension host request.');
    return;
  }

  const { roomId, name, digest, entry } = parsed.data;
  const directory = `/plugins/apps/${roomId}_${name}/${digest}/`;
  const nonce = randomBytes(24).toString('base64');

  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()');

  // A scheme-less host-source inherits the actual browser scheme behind TLS proxies.
  response.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; ` +
      `frame-src ${authority}${directory}; connect-src 'none'; worker-src 'none'; object-src 'none'; ` +
      `base-uri 'none'; form-action 'none'; frame-ancestors 'self'`,
  );

  response.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style nonce="${nonce}">
      html, body, iframe {
        margin: 0;
        width: 100%;
        height: 100%;
        border: 0;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <script nonce="${nonce}">
      const child = document.createElement('iframe');
      child.setAttribute('sandbox', 'allow-scripts allow-forms');
      child.setAttribute('referrerpolicy', 'no-referrer');
      child.title = 'Extension content';

      // frame-ancestors 'self' makes the parent SAGE3, which posts only the init and its port.
      window.addEventListener('message', (event) => {
        if (event.source === window.parent) {
          child.contentWindow.postMessage(event.data, '*', [event.ports[0]]);
        } else if (
          event.source === child.contentWindow &&
          event.data?.protocol === 'sage3:plugin' &&
          event.data.kind === 'ready'
        ) {
          window.parent.postMessage(
            {
              protocol: 'sage3:plugin',
              kind: 'ready',
            },
            window.location.origin
          );
        }
      });

      child.src = ${JSON.stringify(directory + entry)};
      document.body.append(child);
    </script>
  </body>
</html>`);
}
