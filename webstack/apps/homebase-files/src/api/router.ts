import { AssetsCollection } from './assetsCollection';
import { FilesRouter } from './files';
// NPM imports
import * as express from 'express';
import { MessageCollection } from './messageCollection';
/**
 * API Loader function
 * @export
 * @param {any} io  The Socket.io object instance created in main.ts.
 * @returns {express.Router} returns the express router object
 */
export async function expressAPIRouter(): Promise<express.Router> {
  // Express routing
  const router = express.Router();

  await AssetsCollection.initialize();
  await MessageCollection.initialize();

  router.use('/files/process', (req, res) => {
    res.send('Processing');
  });

  router.use(`/files/metadata`, (req, res) => {
    res.send('Metadata');
  });

  // Download the file from an Asset using a public route with a UUIDv5 token
  // route: /api/files/:id/:token
  router.use('/files', FilesRouter());

  // /api/assets/upload
  // /api/assets/static/:filename
  router.use('/assets', AssetsCollection.router());

  return router;
}

export default expressAPIRouter;
