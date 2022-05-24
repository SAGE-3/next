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
import { BoardService } from '../../services';

// Lib Imports
import { BoardHTTP } from '@sage3/shared/types';

/**
 * Board route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function boardExpressRouter(): express.Router {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    const auth = req.user;
    const id = auth.id;
    const createReq = req.body as BoardHTTP.CreateRequest;
    const board = await BoardService.createBoard(createReq.name, createReq.description, id, createReq.roomId);
    const response = {
      success: (board) ? true : false,
      board
    } as BoardHTTP.CreateResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read', async (req, res) => {
    const readReq = req.query as BoardHTTP.ReadRequest;
    const board = await BoardService.readBoard(readReq.id);
    const response = {
      success: (board) ? true : false,
      board
    } as BoardHTTP.ReadResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/all', async (req, res) => {
    const boards = await BoardService.readAllBoards();
    const response = {
      success: (boards) ? true : false,
      boards
    } as BoardHTTP.ReadAllResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/roomid', async (req, res) => {
    const readReq = req.query as BoardHTTP.ReadByRoomIdRequest;
    const boards = await BoardService.readByRoomId(readReq.roomId);
    const response = {
      success: (boards) ? true : false,
      boards
    } as BoardHTTP.ReadByRoomIdResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/name', async (req, res) => {
    const updateReq = req.body as BoardHTTP.UpdateNameRequest;
    const updateRes = await BoardService.updateName(updateReq.id, updateReq.name);
    const response = { success: updateRes } as BoardHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/description', async (req, res) => {
    const updateReq = req.body as BoardHTTP.UpdateDescriptionRequest;
    const updateRes = await BoardService.updateDescription(updateReq.id, updateReq.description);
    const response = { success: updateRes } as BoardHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/color', async (req, res) => {
    const updateReq = req.body as BoardHTTP.UpdateColorRequest;
    const updateRes = await BoardService.updateColor(updateReq.id, updateReq.color);
    const response = { success: updateRes } as BoardHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/ownerid', async (req, res) => {
    const updateReq = req.body as BoardHTTP.UpdateOwnerIdRequest;
    const updateRes = await BoardService.updateOwnerId(updateReq.id, updateReq.ownerId);
    const response = { success: updateRes } as BoardHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/roomid', async (req, res) => {
    const updateReq = req.body as BoardHTTP.UpdateRoomIdRequest;
    const updateRes = await BoardService.updateRoomId(updateReq.id, updateReq.roomId);
    const response = { success: updateRes } as BoardHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/isprivate', async (req, res) => {
    const updateReq = req.body as BoardHTTP.UpdateIsPrivateRequest;
    const updateRes = await BoardService.updateIsPrivate(updateReq.id, updateReq.isPrivate);
    const response = { success: updateRes } as BoardHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.delete('/delete', async (req, res) => {
    const delReq = req.body as BoardHTTP.DeleteRequest;
    const delRes = await BoardService.deleteBoard(delReq.id);
    const response = {
      success: delRes
    } as BoardHTTP.DeleteResponse;
    const status = (delRes) ? 200 : 404;
    res.status(status).send(response);
  });

  return router;
}

