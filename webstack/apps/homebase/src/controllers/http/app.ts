/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The BoardAPI for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// External Importrs
import * as express from 'express';

// App Imports
import { AppService } from '../../services';

// Lib Imports
import { AppHTTP } from '@sage3/shared/types';

/**
 * App route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function appExpressRouter(): express.Router {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    const auth = req.user;
    const id = auth.id;
    const createReq = req.body as AppHTTP.CreateRequest;
    const app = await AppService.createApp(createReq.name, createReq.description, id, createReq.roomId, createReq.boardId, createReq.type, createReq.state);
    const response = {
      success: (app) ? true : false,
      app
    } as AppHTTP.CreateResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read', async (req, res) => {
    const readReq = req.query as AppHTTP.ReadRequest;
    const app = await AppService.readApp(readReq.id);
    const response = {
      success: (app) ? true : false,
      app
    } as AppHTTP.ReadResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/all', async (req, res) => {
    const apps = await AppService.readAllApps();
    const response = {
      success: (apps) ? true : false,
      apps
    } as AppHTTP.ReadAllResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/roomid', async (req, res) => {
    const readReq = req.query as AppHTTP.ReadByRoomIdRequest;
    const apps = await AppService.readByRoomId(readReq.roomId);
    const response = {
      success: (apps) ? true : false,
      apps
    } as AppHTTP.ReadByRoomIdResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/boardid', async (req, res) => {
    const readReq = req.query as AppHTTP.ReadByBoardIdRequest;
    const apps = await AppService.readByRoomId(readReq.boardId);
    const response = {
      success: (apps) ? true : false,
      apps
    } as AppHTTP.ReadByBoardIdResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/name', async (req, res) => {
    const updateReq = req.body as AppHTTP.UpdateNameRequest;
    const updateRes = await AppService.updateName(updateReq.id, updateReq.name);
    const response = { success: updateRes } as AppHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/description', async (req, res) => {
    const updateReq = req.body as AppHTTP.UpdateDescriptionRequest;
    const updateRes = await AppService.updateDescription(updateReq.id, updateReq.description);
    const response = { success: updateRes } as AppHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/ownerid', async (req, res) => {
    const updateReq = req.body as AppHTTP.UpdateOwnerIdRequest;
    const updateRes = await AppService.updateOwnerId(updateReq.id, updateReq.ownerId);
    const response = { success: updateRes } as AppHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/roomId', async (req, res) => {
    const updateReq = req.body as AppHTTP.UpdateRoomIdRequest;
    const updateRes = await AppService.updateRoomId(updateReq.id, updateReq.roomId);
    const response = { success: updateRes } as AppHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/boardId', async (req, res) => {
    const updateReq = req.body as AppHTTP.UpdateBoardIdRequest;
    const updateRes = await AppService.updateRoomId(updateReq.id, updateReq.boardId);
    const response = { success: updateRes } as AppHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.delete('/delete', async (req, res) => {
    const delReq = req.body as AppHTTP.DeleteRequest;
    const delRes = await AppService.deleteApp(delReq.id);
    const response = {
      success: delRes
    } as AppHTTP.DeleteResponse;
    const status = (delRes) ? 200 : 404;
    res.status(status).send(response);
  });

  return router;
}

