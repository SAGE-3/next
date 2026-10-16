/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import express, { NextFunction, Request, Response } from 'express';

import { isVeoApp, parseVeoState, verifyVeoCallbackSecret } from '@sage3/backend';
import { SBDocumentUpdate } from '@sage3/sagebase';
import { AppSchema } from '@sage3/applications/schema';

import { AppsCollection } from '../../../collections';
import { veoSettings } from './settings';

/**
 * Callbacks VEO relays from the app containers, mounted at /api/veo/callback.
 * There is no user session here: each request must carry the app's own callback
 * secret (HMAC of its uid) as a Bearer token, which only this server and VEO know.
 *
 *   POST /state/:uid  JSON state from the container: { lastImage } or { urls }
 *   POST /file/:uid   multipart file upload (no SAGE3 app uses it yet)
 *
 * VEO waits for the answer and never retries, so these answer quickly and honestly.
 */
export function VeoCallbackRouter(): express.Router {
  const router = express.Router();
  const veo = veoSettings();

  // The secret is per uid, so a secret for one app is refused for any other
  function requireCallbackSecret(req: Request<{ uid: string }>, res: Response, next: NextFunction) {
    if (verifyVeoCallbackSecret(veo.callbackKey, req.params.uid, req.get('Authorization'))) {
      next();
    } else {
      res.status(401).json({ message: 'Invalid callback secret' });
    }
  }

  router.post('/state/:uid', requireCallbackSecret, async (req, res) => {
    const parsed = parseVeoState(req.body);
    if (!parsed.ok) {
      res.status(422).json({ message: parsed.reason });
      return;
    }
    try {
      const app = await AppsCollection.get(req.params.uid);
      if (!app || !isVeoApp(app.data.type)) {
        res.status(404).json({ message: 'App not found' });
        return;
      }
      // Dotted keys, as the frontend's updateState uses, so other state fields are untouched
      const update: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed.state)) {
        update[`state.${key}`] = value;
      }
      if (Object.keys(update).length > 0) {
        // SBDocumentUpdate doesn't type paths into the per-app state union, hence the assertion
        await AppsCollection.update(app._id, 'VEO', update as SBDocumentUpdate<AppSchema>);
      }
      res.status(204).send();
    } catch (error) {
      console.error('VEO> state callback failed', error);
      res.status(500).json({ message: 'Failed to update the app' });
    }
  });

  // Accepted but not stored: CoBrowser's container sends no files
  router.post('/file/:uid', requireCallbackSecret, (_req, res) => {
    res.status(204).send();
  });

  return router;
}
