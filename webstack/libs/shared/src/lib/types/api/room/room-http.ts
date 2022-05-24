/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RoomSchema } from "../../schemas"

// CREATE MESSAGES

export type CreateRequest = {
  name: RoomSchema['name'],
  description: RoomSchema['description'],
}

export type CreateResponse = {
  success: boolean,
  room: RoomSchema | undefined
}

// READ MESSAGES

export type ReadRequest = {
  id: RoomSchema['id']
}

export type ReadResponse = {
  success: boolean,
  room: RoomSchema | undefined
}

export type ReadAllRequest = {
}

export type ReadAllResponse = {
  success: boolean,
  rooms: RoomSchema[] | undefined
}

// UPDATE MESSAGES

export type UpdateNameRequest = {
  id: RoomSchema['id'],
  name: RoomSchema['name']
}

export type UpdateDescriptionRequest = {
  id: RoomSchema['id'],
  description: RoomSchema['description']
}

export type UpdateColorRequest = {
  id: RoomSchema['id'],
  color: RoomSchema['color']
}

export type UpdateOwnerIdRequest = {
  id: RoomSchema['id'],
  ownerId: RoomSchema['ownerId']
}

export type UpdateIsPrivateRequest = {
  id: RoomSchema['id'],
  isPrivate: RoomSchema['isPrivate']
}

export type UpdateResponse = {
  success: boolean,
}

// DELETE MESSAGES

export type DeleteRequest = {
  id: RoomSchema['id']
}

export type DeleteResponse = {
  success: boolean,
}
