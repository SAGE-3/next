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

import { BoardSchema, BoardHTTP } from '@sage3/shared/types';
import { httpDELETE, httpGET, httpPOST } from './shared';

/**
 * 
 * @param name 
 * @param description 
 * @param roomId 
 * @returns 
 */
async function createBoard(name: BoardSchema['name'], description: BoardSchema['description'], roomId: BoardSchema['roomId']): Promise<BoardSchema | undefined> {
  const reqBody = { name, description, roomId } as BoardHTTP.CreateRequest;
  const response = await httpPOST<BoardHTTP.CreateRequest, BoardHTTP.CreateResponse>('/api/board/create', reqBody);
  return response.board;
}

/**
 * 
 * @param id 
 * @returns 
 */
async function readBoard(id: BoardSchema['id']): Promise<BoardSchema | undefined> {
  const reqQuery = { id } as BoardHTTP.ReadRequest;
  const response = await httpGET<BoardHTTP.ReadRequest, BoardHTTP.ReadResponse>('/api/board/read', reqQuery);
  return response.board;
}

/**
 * 
 * @returns 
 */
async function readAllBoards(): Promise<BoardSchema[] | undefined> {
  const reqQuery = {} as BoardHTTP.ReadAllRequest;
  const response = await httpGET<BoardHTTP.ReadAllRequest, BoardHTTP.ReadAllResponse>('/api/board/read/all', reqQuery);
  return response.boards;
}

/**
 * 
 * @returns 
 */
async function readByRoomId(roomId: BoardSchema['roomId']): Promise<BoardSchema[] | undefined> {
  const reqQuery = { roomId } as BoardHTTP.ReadByRoomIdRequest;
  const response = await httpGET<BoardHTTP.ReadByRoomIdRequest, BoardHTTP.ReadByRoomIdResponse>('/api/board/read/roomid', reqQuery);
  return response.boards;
}

/**
 * 
 * @param name 
 * @returns 
 */
async function updateName(id: BoardSchema['id'], name: BoardSchema['name']): Promise<boolean> {
  const reqBody = { id, name } as BoardHTTP.UpdateNameRequest;
  const response = await httpPOST<BoardHTTP.UpdateNameRequest, BoardHTTP.UpdateResponse>('/api/board/update/name', reqBody);
  return response.success;
}

/**
 * 
 * @param description 
 * @returns 
 */
async function updateDescription(id: BoardSchema['id'], description: BoardSchema['description']): Promise<boolean> {
  const reqBody = { id, description } as BoardHTTP.UpdateDescriptionRequest;
  const response = await httpPOST<BoardHTTP.UpdateDescriptionRequest, BoardHTTP.UpdateResponse>('/api/board/update/description', reqBody);
  return response.success;
}

/**
 * 
 * @param color 
 * @returns 
 */
async function updateColor(id: BoardSchema['id'], color: BoardSchema['color']): Promise<boolean> {
  const reqBody = { id, color } as BoardHTTP.UpdateColorRequest;
  const response = await httpPOST<BoardHTTP.UpdateColorRequest, BoardHTTP.UpdateResponse>('/api/board/update/color', reqBody);
  return response.success;
}

/**
 * 
 * @param ownerId 
 * @returns 
 */
async function updateOwnerId(id: BoardSchema['id'], ownerId: BoardSchema['ownerId']): Promise<boolean> {
  const reqBody = { id, ownerId } as BoardHTTP.UpdateOwnerIdRequest;
  const response = await httpPOST<BoardHTTP.UpdateOwnerIdRequest, BoardHTTP.UpdateResponse>('/api/board/update/ownerid', reqBody);
  return response.success;
}

/**
 * 
 * @param roomId 
 * @returns 
 */
async function updateRoomId(id: BoardSchema['id'], roomId: BoardSchema['roomId']): Promise<boolean> {
  const reqBody = { id, roomId } as BoardHTTP.UpdateRoomIdRequest;
  const response = await httpPOST<BoardHTTP.UpdateRoomIdRequest, BoardHTTP.UpdateResponse>('/api/board/update/roomid', reqBody);
  return response.success;
}

/**
 * 
 * @param isPrivate 
 * @returns 
 */
async function updateIsPrivate(id: BoardSchema['id'], isPrivate: BoardSchema['isPrivate']): Promise<boolean> {
  const reqBody = { id, isPrivate } as BoardHTTP.UpdateIsPrivateRequest;
  const response = await httpPOST<BoardHTTP.UpdateIsPrivateRequest, BoardHTTP.UpdateResponse>('/api/board/update/isprivate', reqBody);
  return response.success;
}


/**
 * 
 * @param id 
 * @returns 
 */
async function deleteBoard(id: BoardSchema['id']): Promise<boolean> {
  const reqBody = { id } as BoardHTTP.DeleteRequest;
  const response = await httpDELETE<BoardHTTP.DeleteRequest, BoardHTTP.DeleteResponse>('/api/board/delete', reqBody);
  return response.success;
}

/**
 * Board HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const BoardHTTPService = {
  createBoard,
  readBoard,
  readAllBoards,
  readByRoomId,
  updateName,
  updateDescription,
  updateColor,
  updateOwnerId,
  updateRoomId,
  updateIsPrivate,
  deleteBoard
};
