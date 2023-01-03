/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';

import { SBAuthSchema, SBJSON } from '@sage3/sagebase';
import { SAGE3Collection } from './SAGECollection';

import { checkPermissionsREST, AuthSubject } from './permissions';

export function sageRouter<T extends SBJSON>(collection: SAGE3Collection<T>): express.Router {
  const router = express.Router();

  //  Check permissions on collections
  router.use(checkPermissionsREST(collection.name as AuthSubject));

  // POST: Add new document
  router.post('/', async ({ body, user }, res) => {
    // @ts-ignore
    const userId = user.id;
    const doc = await collection.add(body, userId);
    if (doc) res.status(200).send({ success: true, data: [doc] });
    else res.status(500).send({ success: false, message: 'Failed to create document.' });
  });

  // GET: Get all the docs or Query
  router.get('/', async ({ query }, res) => {
    let docs = null;
    if (Object.keys(query).length === 0) {
      docs = await collection.getAll();
    } else if (Object.keys(query).length === 1) {
      const field = Object.keys(query)[0];
      const q = query[field] as string | number;
      docs = await collection.query(field, q);
    } else {
      res.status(500).send({ success: false, message: 'Too many query parameters. Only one query parameter currently allowed.' });
    }
    if (docs) res.status(200).send({ success: true, data: docs });
    else res.status(500).send({ success: false, message: 'Failed to get documents.' });
  });

  // GET: Get one doc.
  router.get('/:id', async ({ params }, res) => {
    const doc = await collection.get(params.id);
    if (doc) res.status(200).send({ success: true, data: [doc] });
    else res.status(500).send({ success: false, message: 'Failed to get document.' });
  });

  // PUT: Update one doc.
  router.put('/:id', async ({ params, body, user }, res) => {
    const auth = user as SBAuthSchema;
    const userId = auth?.id || '-';
    const update = await collection.update(params.id, userId, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false, message: 'Failed to update document.' });
  });

  // DELETE: Delete one doc.
  router.delete('/:id', async ({ params }, res) => {
    const del = await collection.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false, message: 'Failed to delete document.' });
  });

  return router;
}
