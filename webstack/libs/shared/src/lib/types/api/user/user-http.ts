/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UserSchema } from "../../schemas"

// CREATE MESSAGES

export type CreateRequest = {
  name: UserSchema['name'],
  email: UserSchema['email'],
}

export type CreateResponse = {
  success: boolean,
  user: UserSchema | undefined
}

// READ MESSAGES

export type ReadRequest = {
  id: UserSchema['id']
}

export type ReadResponse = {
  success: boolean,
  user: UserSchema | undefined
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type ReadAllRequest = {}

export type ReadAllResponse = {
  success: boolean,
  users: UserSchema[] | undefined
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type ReadCurrentRequest = {}

export type ReadCurrentResponse = {
  success: boolean,
  user: UserSchema | undefined
}

// UPDATE MESSAGES

export type UpdateNameRequest = {
  name: UserSchema['name']
}

export type UpdateEmailRequest = {
  email: UserSchema['email']
}

export type UpdateColorRequest = {
  color: UserSchema['color']
}

export type UpdateProfilePictureRequest = {
  profilePicture: UserSchema['profilePicture']
}

export type UpdateUserTypeRequest = {
  userType: UserSchema['userType']
}

export type UpdateUserRoleRequest = {
  userRole: UserSchema['userRole']
}

export type UpdateResponse = {
  success: boolean,
}

// DELETE MESSAGES

export type DeleteRequest = {
  id: UserSchema['id']
}

export type DeleteResponse = {
  success: boolean,
}
