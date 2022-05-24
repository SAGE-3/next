/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { SBPrimitive } from "@sage3/sagebase"
import { AppSchema } from "@sage3/applications"

// CREATE MESSAGES

export type CreateRequest = {
  name: AppSchema['name'],
  description: AppSchema['description'],
  roomId: AppSchema['roomId']
  boardId: AppSchema['boardId'],
  type: string,
  state: SBPrimitive,
}

export type CreateResponse = {
  success: boolean,
  app: AppSchema | undefined
}

// READ MESSAGES

export type ReadRequest = {
  id: AppSchema['id']
}
export type ReadResponse = {
  success: boolean,
  app: AppSchema | undefined
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type ReadAllRequest = {}
export type ReadAllResponse = {
  success: boolean,
  apps: AppSchema[] | undefined
}

export type ReadByRoomIdRequest = {
  roomId: AppSchema['roomId']
}
export type ReadByRoomIdResponse = {
  success: boolean,
  apps: AppSchema[] | undefined
}

export type ReadByBoardIdRequest = {
  boardId: AppSchema['boardId']
}
export type ReadByBoardIdResponse = {
  success: boolean,
  apps: AppSchema[] | undefined
}

// UPDATE MESSAGES

export type UpdateNameRequest = {
  id: AppSchema['id'],
  name: AppSchema['name']
}

export type UpdateDescriptionRequest = {
  id: AppSchema['id'],
  description: AppSchema['description']
}

export type UpdateOwnerIdRequest = {
  id: AppSchema['id'],
  ownerId: AppSchema['ownerId']
}

export type UpdateRoomIdRequest = {
  id: AppSchema['id'],
  roomId: AppSchema['roomId']
}

export type UpdateBoardIdRequest = {
  id: AppSchema['id'],
  boardId: AppSchema['boardId']
}

export type UpdateResponse = {
  success: boolean,
}

// DELETE MESSAGES

export type DeleteRequest = {
  id: AppSchema['id']
}

export type DeleteResponse = {
  success: boolean,
}
