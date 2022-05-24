/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The UserAPI for SAGE3
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
import { UserService } from '../../services';

// Lib Imports
import { UserHTTP, UserRole } from '@sage3/shared/types';

/**
 * User route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function userExpressRouter(): express.Router {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    const auth = req.user;
    const id = auth.id;
    const role = (auth.provider === 'guest') ? 'guest' as UserRole : 'user' as UserRole;
    const createReq = req.body as UserHTTP.CreateRequest;
    const user = await UserService.createUser(id, createReq.name, createReq.email, role);
    const response = {
      success: (user) ? true : false,
      user
    } as UserHTTP.CreateResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read', async (req, res) => {
    const readReq = req.query as UserHTTP.ReadRequest;
    const user = await UserService.readUser(readReq.id);
    const response = {
      success: (user) ? true : false,
      user
    } as UserHTTP.ReadResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/all', async (req, res) => {
    const users = await UserService.readAllUsers();
    const response = {
      success: (users) ? true : false,
      users
    } as UserHTTP.ReadAllResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.get('/read/current', async (req, res) => {
    const id = req.user.id;
    const user = await UserService.readUser(id);
    const response = {
      success: (user) ? true : false,
      user
    } as UserHTTP.ReadCurrentResponse;
    const status = (response.success) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/name', async (req, res) => {
    const id = req.user.id;
    const updateReq = req.body as UserHTTP.UpdateNameRequest;
    const updateRes = await UserService.updateName(id, updateReq.name);
    const response = { success: updateRes } as UserHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/email', async (req, res) => {
    const id = req.user.id;
    const updateReq = req.body as UserHTTP.UpdateEmailRequest;
    const updateRes = await UserService.updateEmail(id, updateReq.email);
    const response = { success: updateRes } as UserHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/color', async (req, res) => {
    const id = req.user.id;
    const updateReq = req.body as UserHTTP.UpdateColorRequest;
    const updateRes = await UserService.updateColor(id, updateReq.color);
    const response = { success: updateRes } as UserHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/profilepicture', async (req, res) => {
    const id = req.user.id;
    const updateReq = req.body as UserHTTP.UpdateProfilePictureRequest;
    const updateRes = await UserService.updateProfilePicture(id, updateReq.profilePicture);
    const response = { success: updateRes } as UserHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/usertype', async (req, res) => {
    const id = req.user.id;
    const updateReq = req.body as UserHTTP.UpdateUserTypeRequest;
    const updateRes = await UserService.updateUserType(id, updateReq.userType);
    const response = { success: updateRes } as UserHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.post('/update/userrole', async (req, res) => {
    const id = req.user.id;
    const updateReq = req.body as UserHTTP.UpdateUserRoleRequest;
    const updateRes = await UserService.updateUserRole(id, updateReq.userRole);
    const response = { success: updateRes } as UserHTTP.UpdateResponse;
    const status = (updateRes) ? 200 : 404;
    res.status(status).send(response);
  });

  router.delete('/delete', async (req, res) => {
    const delReq = req.body as UserHTTP.DeleteRequest;
    const delRes = await UserService.deleteUser(delReq.id);
    const response = { success: delRes } as UserHTTP.DeleteResponse;
    const status = (delRes) ? 200 : 404;
    res.status(status).send(response);
  });

  return router;
}
