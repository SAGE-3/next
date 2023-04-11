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

  // POST: Add new document or multiple docs with a batch request
  router.post('/', async ({ body, user }, res) => {
    const auth = user as SBAuthSchema;
    const userId = auth?.id || '-';
    // Check if body has property 'batch', if so this is a batch request
    if (body && body.batch) {
      const docs = await collection.addBatch(body, userId);
      if (docs) res.status(200).send({ success: true, message: 'Successfully created the documents.', data: docs });
      else res.status(500).send({ success: false, message: 'Failed to create the documents.', data: undefined });
    } else {
      const doc = await collection.add(body, userId);
      if (doc) res.status(200).send({ success: true, message: 'Successfully created the document.', data: [doc] });
      else res.status(500).send({ success: false, message: 'Failed to create the document.', data: undefined });
    }
  });

  // GET: Get all the docs, multiple docs by id, or query
  router.get('/', async ({ query, body }, res) => {
    let docs = null;
    // If body has property 'batch', this is a batch request
    if (body && body.batch) {
      docs = await collection.getBatch(body.batch);
    }
    // Check for a query, if not query get all the docs
    else if (Object.keys(query).length === 0) {
      docs = await collection.getAll();
    } else if (Object.keys(query).length === 1) {
      const field = Object.keys(query)[0];
      const q = query[field] as string | number;
      docs = await collection.query(field, q);
    } else {
      res.status(500).send({ success: false, message: 'Too many query parameters. Only one query parameter allowed.', data: undefined });
    }
    if (docs) res.status(200).send({ success: true, message: 'Successfully retrieved documents.', data: docs });
    else res.status(500).send({ success: false, message: 'Failed to retrieve documents.', data: undefined });
  });

  // GET: Get one doc.
  router.get('/:id', async ({ params }, res) => {
    const doc = await collection.get(params.id);
    if (doc) res.status(200).send({ success: true, message: 'Successfully retrieved the documents.', data: [doc] });
    else res.status(500).send({ success: false, message: 'Failed to retrieve the document.', data: undefined });
  });

  // PUT: Update multiple docs with a batch
  router.put('', async ({ body, user }, res) => {
    const auth = user as SBAuthSchema;
    const userId = auth?.id || '-';
    if (body && body.batch) {
      const success = await collection.updateBatch(body, userId);
      if (success) res.status(200).send({ success: true, message: 'Successfully updated documents.', data: success });
      else res.status(500).send({ success: false, message: 'Failed to update documents.', data: undefined });
    } else {
      res.status(500).send({ success: false, message: 'No batch property on body.', data: undefined });
    }
  });

  // PUT: Update one doc
  router.put('/:id', async ({ params, body, user }, res) => {
    const auth = user as SBAuthSchema;
    const userId = auth?.id || '-';
    const update = await collection.update(params.id, userId, body);
    if (update) res.status(200).send({ success: true, message: 'Successfully updated the document.', data: [update] });
    else res.status(500).send({ success: false, message: 'Failed to update document.', data: undefined });
  });

  // DELETE: Delete multiple docs with batch
  router.delete('', async ({ body }, res) => {
    if (body && body.batch) {
      const success = await collection.deleteBatch(body);
      if (success) res.status(200).send({ success: true, message: 'Successfully deleted the documents.', data: success });
      else res.status(500).send({ success: false, message: 'Failed to delete the documents.', data: undefined });
    } else {
      res.status(500).send({ success: false, message: 'No batch property on body.', data: undefined });
    }
  });

  // DELETE: Delete one doc
  router.delete('/:id', async ({ params }, res) => {
    const del = await collection.delete(params.id);
    if (del) res.status(200).send({ success: true, message: 'Successfully deleted the document.', data: [del] });
    else res.status(500).send({ success: false, message: 'Failed to delete document.', data: undefined });
  });

  return router;
}
