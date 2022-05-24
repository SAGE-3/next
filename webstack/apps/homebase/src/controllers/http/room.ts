/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The RoomAPI for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// External Imports
import * as express from 'express';

// App Imports
import { RoomService } from '../../services';

// Lib Imports
import { RoomHTTP } from '@sage3/shared/types';

/**
 * Room route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function roomExpressRouter(): express.Router {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    const auth = req.user;
    const id = auth.id;
    const createReq = req.body as RoomHTTP.CreateRequest;
    const room = await RoomService.createRoom(createReq.name, createReq.description, id);
    const response = {
      success: (room) ? true : false,
      room
    } as RoomHTTP.CreateResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read', async (req, res) => {
    const readReq = req.query as RoomHTTP.ReadRequest;
    const room = await RoomService.readRoom(readReq.id);
    const response = {
      success: (room) ? true : false,
      room
    } as RoomHTTP.ReadResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/all', async (req, res) => {
    const rooms = await RoomService.readAllRooms();
    const response = {
      success: (rooms) ? true : false,
      rooms
    } as RoomHTTP.ReadAllResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/name', async (req, res) => {
    const updateReq = req.body as RoomHTTP.UpdateNameRequest;
    const updateRes = await RoomService.updateName(updateReq.id, updateReq.name);
    const response = { success: updateRes } as RoomHTTP.UpdateResponse;
    const status = (response) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/description', async (req, res) => {
    const updateReq = req.body as RoomHTTP.UpdateDescriptionRequest;
    const updateRes = await RoomService.updateDescription(updateReq.id, updateReq.description);
    const response = { success: updateRes } as RoomHTTP.UpdateResponse;
    const status = (response) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/color', async (req, res) => {
    const updateReq = req.body as RoomHTTP.UpdateColorRequest;
    const updateRes = await RoomService.updateColor(updateReq.id, updateReq.color);
    const response = { success: updateRes } as RoomHTTP.UpdateResponse;
    const status = (response) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/ownerid', async (req, res) => {
    const updateReq = req.body as RoomHTTP.UpdateOwnerIdRequest;
    const updateRes = await RoomService.updateOwnerId(updateReq.id, updateReq.ownerId);
    const response = { success: updateRes } as RoomHTTP.UpdateResponse;
    const status = (response) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/isprivate', async (req, res) => {
    const updateReq = req.body as RoomHTTP.UpdateIsPrivateRequest;
    const updateRes = await RoomService.updateIsPrivate(updateReq.id, updateReq.isPrivate);
    const response = { success: updateRes } as RoomHTTP.UpdateResponse;
    const status = (response) ? 200 : 404;
    res.status(status).send(response);
  });

  router.delete('/delete', async (req, res) => {
    const delReq = req.body as RoomHTTP.DeleteRequest;
    const delRes = await RoomService.deleteRoom(delReq.id);
    const response = { success: delRes } as RoomHTTP.DeleteResponse;
    const status = (delRes) ? 200 : 404;
    res.status(status).send(response);
  });

  return router;
}

