/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Room API Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { RoomSchema, RoomHTTP } from '@sage3/shared/types';
import { httpDELETE, httpGET, httpPOST } from './http';

/**
 * 
 * @param name 
 * @param description 
 * @returns 
 */
async function createRoom(name: RoomSchema['name'], description: RoomSchema['description']): Promise<RoomSchema | undefined> {
  const reqBody = { name, description } as RoomHTTP.CreateRequest;
  const response = await httpPOST<RoomHTTP.CreateRequest, RoomHTTP.CreateResponse>('/api/room/create', reqBody);
  return response.room;
}

/**
 * 
 * @param id 
 * @returns 
 */
async function readRoom(id: RoomSchema['id']): Promise<RoomSchema | undefined> {
  const reqQuery = { id } as RoomHTTP.ReadRequest;
  const response = await httpGET<RoomHTTP.ReadRequest, RoomHTTP.ReadResponse>('/api/room/read', reqQuery);
  return response.room;
}

/**
 * 
 * @returns 
 */
async function readAllRooms(): Promise<RoomSchema[] | undefined> {
  const reqQuery = {} as RoomHTTP.ReadAllRequest;
  const response = await httpGET<RoomHTTP.ReadAllRequest, RoomHTTP.ReadAllResponse>('/api/room/read/all', reqQuery);
  return response.rooms;
}

/**
 * 
 * @param name 
 * @returns 
 */
async function updateName(id: RoomSchema['id'], name: RoomSchema['name']): Promise<boolean> {
  const reqBody = { id, name } as RoomHTTP.UpdateNameRequest;
  const response = await httpPOST<RoomHTTP.UpdateNameRequest, RoomHTTP.UpdateResponse>('/api/room/update/name', reqBody);
  return response.success;
}

/**
 * 
 * @param description 
 * @returns 
 */
async function updateDescription(id: RoomSchema['id'], description: RoomSchema['description']): Promise<boolean> {
  const reqBody = { id, description } as RoomHTTP.UpdateDescriptionRequest;
  const response = await httpPOST<RoomHTTP.UpdateDescriptionRequest, RoomHTTP.UpdateResponse>('/api/room/update/description', reqBody);
  return response.success;
}

/**
 * 
 * @param color 
 * @returns 
 */
async function updateColor(id: RoomSchema['id'], color: RoomSchema['color']): Promise<boolean> {
  const reqBody = { id, color } as RoomHTTP.UpdateColorRequest;
  const response = await httpPOST<RoomHTTP.UpdateColorRequest, RoomHTTP.UpdateResponse>('/api/room/update/color', reqBody);
  return response.success;
}

/**
 * 
 * @param ownerId 
 * @returns 
 */
async function updateOwnerId(id: RoomSchema['id'], ownerId: RoomSchema['ownerId']): Promise<boolean> {
  const reqBody = { id, ownerId } as RoomHTTP.UpdateOwnerIdRequest;
  const response = await httpPOST<RoomHTTP.UpdateOwnerIdRequest, RoomHTTP.UpdateResponse>('/api/room/update/ownerid', reqBody);
  return response.success;
}

/**
 * 
 * @param isPrivate 
 * @returns 
 */
async function updateIsPrivate(id: RoomSchema['id'], isPrivate: RoomSchema['isPrivate']): Promise<boolean> {
  const reqBody = { id, isPrivate } as RoomHTTP.UpdateIsPrivateRequest;
  const response = await httpPOST<RoomHTTP.UpdateIsPrivateRequest, RoomHTTP.UpdateResponse>('/api/room/update/isprivate', reqBody);
  return response.success;
}


/**
 * 
 * @param id 
 * @returns 
 */
async function deleteRoom(id: RoomSchema['id']): Promise<boolean> {
  const reqBody = { id } as RoomHTTP.DeleteRequest;
  const response = await httpDELETE<RoomHTTP.DeleteRequest, RoomHTTP.DeleteResponse>('/api/room/delete', reqBody);
  return response.success;
}

/**
 * Room HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const RoomHTTPService = {
  createRoom,
  readRoom,
  readAllRooms,
  updateName,
  updateDescription,
  updateColor,
  updateOwnerId,
  updateIsPrivate,
  deleteRoom
};
