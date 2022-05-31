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

import { BoardSchema } from '@sage3/shared/types';
import { httpDELETE, httpGET, httpPOST, httpPUT } from './http';

async function create(
  name: BoardSchema['name'],
  description: BoardSchema['description'],
  roomId: BoardSchema['roomId']
): Promise<BoardSchema[] | undefined> {
  const body = { name, description, roomId };
  const res = await httpPOST('/api/board', body);
  return res.boards;
}

async function read(id: BoardSchema['id']): Promise<BoardSchema[] | undefined> {
  const params = { id };
  const response = await httpGET('/api/boards', params);
  return response.boards;
}

async function readAll(): Promise<BoardSchema[] | undefined> {
  const response = await httpGET('/api/boards');
  return response.boards;
}

async function query(query: Partial<BoardSchema>): Promise<BoardSchema[] | undefined> {
  const params = { ...query };
  const response = await httpGET('/api/boards', params);
  return response.boards;
}

async function update(id: BoardSchema['id'], update: Partial<BoardSchema>): Promise<boolean> {
  const params = { id } as Partial<BoardSchema>;
  const response = await httpPUT('/api/boards', params, update);
  return response.success;
}

async function del(id: BoardSchema['id']): Promise<boolean> {
  const params = { id };
  const response = await httpDELETE('/api/boards', params);
  return response.success;
}

/**
 * Board HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const BoardHTTPService = {
  create,
  read,
  readAll,
  query,
  update,
  del,
};
