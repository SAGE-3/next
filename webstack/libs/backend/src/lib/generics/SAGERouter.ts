import { SBJSON } from "@sage3/sagebase";
import * as express from 'express';
import { SAGE3Collection } from "./SAGECollection";

export function sageRouter<T extends SBJSON>(collection: SAGE3Collection<T>): express.Router {
  const router = express.Router();

  // The path of the route
  const path = '/' + collection.name.toLowerCase();

  // POST: Add new document
  router.post(path, async ({ body }, res) => {
    const doc = await collection.add(body);
    if (doc) res.status(200).send({ success: true, data: [doc] });
    else res.status(500).send({ success: false, message: "Failed to create document." });
  });

  // GET: Get all the docs or Query
  router.get(path, async ({ query }, res) => {
    let docs = null;
    if (Object.keys(query).length === 0) {
      docs = await collection.getAll();
    } else if (Object.keys(query).length === 1) {
      const field = Object.keys(query)[0];
      const q = query[field] as Partial<T>;
      docs = await collection.query(field, q);
    } else {
      res.status(500).send({ success: false, message: "Too many query parameters. Only one query parameter currently allowed." });
    }
    if (docs) res.status(200).send({ success: true, data: docs });
    else res.status(500).send({ success: false, message: "Failed to get documents." });
  });

  // GET: Get one doc.
  router.get(path + '/:id', async ({ params }, res) => {
    const doc = await collection.get(params.id);
    if (doc) res.status(200).send({ success: true, data: [doc] });
    else res.status(500).send({ success: false, message: "Failed to get document." });
  });

  // PUT: Update one doc.
  router.put(path + '/:id', async ({ params, body }, res) => {
    const update = await collection.update(params.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false, message: "Failed to update document." });
  });

  // DELETE: Delete one doc.
  router.delete(path + '/:id', async ({ params }, res) => {
    const del = await collection.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false, message: "Failed to delete document." });
  });

  return router;
}