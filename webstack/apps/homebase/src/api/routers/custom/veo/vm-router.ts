/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import express, { Response } from 'express';

import { buildVeoLaunchBody, isVeoApp, veoCallbackSecret } from '@sage3/backend';

import { AppsCollection } from '../../../collections';
import { veoSettings, veoCallbacksEnabled } from './settings';
import { veoFetch, VeoResponse } from './client';

/**
 * Browser-facing VEO routes, mounted behind user authentication at /api/veo/vm.
 * They replace the browser's direct calls to VEO: the server decides the container,
 * adds VEO_SECRET, and registers the app's callback secret and URLs.
 *
 *   POST /any/:uid  start the app's container, or return its stream path if running
 *   GET  /ws/:uid   return the running container's stream path
 *
 * The uid is the SAGE3 app id.
 */
export function VeoVmRouter(): express.Router {
  const router = express.Router();
  const veo = veoSettings();

  if (!veoCallbacksEnabled(veo)) {
    console.warn('VEO> veoServer.callbackUrl or VEO_CALLBACK_KEY is unset: VEO callbacks are disabled');
  }

  router.post('/any/:uid', async (req, res) => {
    const uid = req.params.uid;
    const app = await AppsCollection.get(uid);
    if (!app) {
      res.status(404).json({ message: 'App not found' });
      return;
    }
    const callbacks = veoCallbacksEnabled(veo);
    const body = buildVeoLaunchBody(app.data.type, req.body?.env, callbacks ? veo.callbackUrl : undefined);
    if (!body) {
      res.status(400).json({ message: `${app.data.type} apps do not run on VEO` });
      return;
    }
    const headers: Record<string, string> = callbacks ? { 'X-Callback-Secret': veoCallbackSecret(veo.callbackKey, uid) } : {};
    await forward(res, () => veoFetch(veo, 'POST', `/api/vm/any/${encodeURIComponent(uid)}`, body, headers));
  });

  router.get('/ws/:uid', async (req, res) => {
    const uid = req.params.uid;
    const app = await AppsCollection.get(uid);
    if (!app || !isVeoApp(app.data.type)) {
      res.status(404).json({ message: 'App not found' });
      return;
    }
    await forward(res, () => veoFetch(veo, 'GET', `/api/vm/ws/${encodeURIComponent(uid)}`));
  });

  /**
   * Relay VEO's answer to the browser.
   * VEO refusing our credentials is a server misconfiguration, not the user's
   * failure to authenticate, so it becomes a 502 rather than a 401/403.
   */
  async function forward(res: Response, call: () => Promise<VeoResponse>) {
    if (!veo.url) {
      res.status(503).json({ message: 'VEO server is not configured' });
      return;
    }
    try {
      const { status, json } = await call();
      if (status === 401 || status === 403) {
        console.error("VEO> rejected this server's credentials (check VEO_SECRET):", status);
        res.status(502).json({ message: "VEO server rejected this server's credentials" });
        return;
      }
      res.status(status).json(json);
    } catch (error) {
      console.error('VEO> request failed', error);
      res.status(502).json({ message: 'Failed to communicate with the VEO server' });
    }
  }

  return router;
}
