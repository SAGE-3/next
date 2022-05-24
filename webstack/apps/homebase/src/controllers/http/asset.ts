// /**
//  * Copyright (c) SAGE3 Development Team
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  *
//  */

// /**
//  * User API Routes which provide assets information.
//  * This file contains the routes for the asset services.
//  * @file User API Route
//  * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
//  * @version 1.0.0
//  */

// import { SAGEBase } from '@sage3/sagebase';
// import * as express from 'express';
// import { AssetService } from '../services';

// /**
//  * User route/api initialization function.
//  * @returns {express.Router} returns the express router object
//  */
// export function AssetExpressRouter(): express.Router {
//   const router = express.Router();

//   router.use(SAGEBase.Auth.authenticate);

//   /**
//    * Route GET to retrive the list of assets
//    * Dev URL: http://localhost:3333/api/content/assets
//    */
//   router.get('/assets', (req, res) => {
//     AssetService.getAllAssets(req, res);
//   });

//   /**
//    * Route GET to retrive one asset
//    * Dev URL: http://localhost:3333/api/content/asset/24334534232
//    */
//   router.get('/asset/:assetId', (req, res) => {
//     AssetService.getAssetById(req, res);
//   });

//   /**
//    * Route to delete an asset
//    */
//   router.get('/asset/delete/:assetId', (req, res) => {
//     AssetService.deleteFile(req, res);
//   });

//   return router;
// }
