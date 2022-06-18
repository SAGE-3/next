import { SBJSON } from "@sage3/sagebase";
import * as express from 'express';
import { SAGECollection } from "./SAGECollection";

export function sageRouter<T extends SBJSON>(collection: SAGECollection<T>): express.Router {
  const router = express.Router();

  // The path of the route
  const path = '/' + collection.name.toLowerCase();

  // POST: Add new document
  router.post(path, async ({ body }, res) => {
    const doc = await collection.add(body);
    if (doc) res.status(200).send({ success: true, data: doc });
    else res.status(500).send({ success: false });
  });

  // GET: Get all the docs.
  router.get(path, async (req, res) => {
    const docs = await collection.getAll();
    if (docs) res.status(200).send({ success: true, data: docs });
    else res.status(500).send({ success: false });
  });

  // GET: Get one doc.
  router.get(path + '/:id', async ({ params }, res) => {
    const doc = await collection.get(params.id);
    if (doc) res.status(200).send({ success: true, data: doc });
    else res.status(500).send({ success: false });
  });

  // PUT: Update one doc.
  router.put(path + '/:id', async ({ params, body }, res) => {
    const update = await collection.update(params.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  // DELETE: Delete one doc.
  router.delete(path + '/:id', async ({ params }, res) => {
    const del = await collection.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  return router;
}