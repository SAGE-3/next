/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Board HTTP Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { AppSchema } from '@sage3/applications';
import { SBPrimitive } from '@sage3/sagebase';
import { AppHTTP } from '@sage3/shared/types';

import { httpDELETE, httpGET, httpPOST } from './shared';

/**
 * 
 * @param name 
 * @param description 
 * @param roomId 
 * @returns 
 */
async function createApp(name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: string, state: SBPrimitive): Promise<AppSchema | undefined> {
  const reqBody = { name, description, roomId, boardId, type, state } as AppHTTP.CreateRequest;
  const response = await httpPOST<AppHTTP.CreateRequest, AppHTTP.CreateResponse>('/api/app/create', reqBody);
  return response.app;
}

/**
 * 
 * @param id 
 * @returns 
 */
async function readApp(id: AppSchema['id']): Promise<AppSchema | undefined> {
  const reqQuery = { id } as AppHTTP.ReadRequest;
  const response = await httpGET<AppHTTP.ReadRequest, AppHTTP.ReadResponse>('/api/app/read', reqQuery);
  return response.app;
}

/**
 * 
 * @returns 
 */
async function readAllApps(): Promise<AppSchema[] | undefined> {
  const reqQuery = {} as AppHTTP.ReadAllRequest;
  const response = await httpGET<AppHTTP.ReadAllRequest, AppHTTP.ReadAllResponse>('/api/app/read/all', reqQuery);
  return response.apps;
}

/**
 * 
 * @returns 
 */
async function readByRoomId(roomId: AppSchema['roomId']): Promise<AppSchema[] | undefined> {
  const reqQuery = { roomId } as AppHTTP.ReadByRoomIdRequest;
  const response = await httpGET<AppHTTP.ReadByRoomIdRequest, AppHTTP.ReadByRoomIdResponse>('/api/app/read/roomid', reqQuery);
  return response.apps;
}

/**
 * 
 * @returns 
 */
async function readByBoardId(boardId: AppSchema['boardId']): Promise<AppSchema[] | undefined> {
  const reqQuery = { boardId } as AppHTTP.ReadByBoardIdRequest;
  const response = await httpGET<AppHTTP.ReadByBoardIdRequest, AppHTTP.ReadByBoardIdResponse>('/api/app/read/boardid', reqQuery);
  return response.apps;
}

/**
 * 
 * @param name 
 * @returns 
 */
async function updateName(id: AppSchema['id'], name: AppSchema['name']): Promise<boolean> {
  const reqBody = { id, name } as AppHTTP.UpdateNameRequest;
  const response = await httpPOST<AppHTTP.UpdateNameRequest, AppHTTP.UpdateResponse>('/api/app/update/name', reqBody);
  return response.success;
}

/**
 * 
 * @param description 
 * @returns 
 */
async function updateDescription(id: AppSchema['id'], description: AppSchema['description']): Promise<boolean> {
  const reqBody = { id, description } as AppHTTP.UpdateDescriptionRequest;
  const response = await httpPOST<AppHTTP.UpdateDescriptionRequest, AppHTTP.UpdateResponse>('/api/app/update/description', reqBody);
  return response.success;
}


/**
 * 
 * @param ownerId 
 * @returns 
 */
async function updateOwnerId(id: AppSchema['id'], ownerId: AppSchema['ownerId']): Promise<boolean> {
  const reqBody = { id, ownerId } as AppHTTP.UpdateOwnerIdRequest;
  const response = await httpPOST<AppHTTP.UpdateOwnerIdRequest, AppHTTP.UpdateResponse>('/api/app/update/ownerid', reqBody);
  return response.success;
}

/**
 * 
 * @param roomId 
 * @returns 
 */
async function updateRoomId(id: AppSchema['id'], roomId: AppSchema['roomId']): Promise<boolean> {
  const reqBody = { id, roomId } as AppHTTP.UpdateRoomIdRequest;
  const response = await httpPOST<AppHTTP.UpdateRoomIdRequest, AppHTTP.UpdateResponse>('/api/app/update/roomid', reqBody);
  return response.success;
}

/**
 * 
 * @param boardId 
 * @returns 
 */
async function updateBoardId(id: AppSchema['id'], boardId: AppSchema['boardId']): Promise<boolean> {
  const reqBody = { id, boardId } as AppHTTP.UpdateBoardIdRequest;
  const response = await httpPOST<AppHTTP.UpdateBoardIdRequest, AppHTTP.UpdateResponse>('/api/app/update/boardid', reqBody);
  return response.success;
}


/**
 * 
 * @param id 
 * @returns 
 */
async function deleteApp(id: AppSchema['id']): Promise<boolean> {
  const reqBody = { id } as AppHTTP.DeleteRequest;
  const response = await httpDELETE<AppHTTP.DeleteRequest, AppHTTP.DeleteResponse>('/api/app/delete', reqBody);
  return response.success;
}

/**
 * App HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const AppHTTPService = {
  createApp,
  readApp,
  readAllApps,
  readByRoomId,
  readByBoardId,
  updateName,
  updateDescription,
  updateOwnerId,
  updateRoomId,
  updateBoardId,
  deleteApp
};
