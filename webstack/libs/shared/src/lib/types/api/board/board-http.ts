/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { BoardSchema } from "../../schemas"

// CREATE MESSAGES

export type CreateRequest = {
  name: BoardSchema['name'],
  description: BoardSchema['description'],
  roomId: BoardSchema['roomId']
}

export type CreateResponse = {
  success: boolean,
  board: BoardSchema | undefined
}

// READ MESSAGES

export type ReadRequest = {
  id: BoardSchema['id']
}
export type ReadResponse = {
  success: boolean,
  board: BoardSchema | undefined
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type ReadAllRequest = {}
export type ReadAllResponse = {
  success: boolean,
  boards: BoardSchema[] | undefined
}

export type ReadByRoomIdRequest = {
  roomId: BoardSchema['roomId']
}
export type ReadByRoomIdResponse = {
  success: boolean,
  boards: BoardSchema[] | undefined
}

// UPDATE MESSAGES

export type UpdateNameRequest = {
  id: BoardSchema['id'],
  name: BoardSchema['name']
}

export type UpdateDescriptionRequest = {
  id: BoardSchema['id'],
  description: BoardSchema['description']
}

export type UpdateColorRequest = {
  id: BoardSchema['id'],
  color: BoardSchema['color']
}

export type UpdateOwnerIdRequest = {
  id: BoardSchema['id'],
  ownerId: BoardSchema['ownerId']
}

export type UpdateRoomIdRequest = {
  id: BoardSchema['id'],
  roomId: BoardSchema['roomId']
}

export type UpdateIsPrivateRequest = {
  id: BoardSchema['id'],
  isPrivate: BoardSchema['isPrivate']
}

export type UpdateResponse = {
  success: boolean,
}

// DELETE MESSAGES

export type DeleteRequest = {
  id: BoardSchema['id']
}

export type DeleteResponse = {
  success: boolean,
}
