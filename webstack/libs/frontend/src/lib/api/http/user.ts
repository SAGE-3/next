/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * User HTTP Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { UserHTTP, UserSchema } from '@sage3/shared/types';
import { httpDELETE, httpGET, httpPOST } from './shared';

/**
 * 
 * @param name 
 * @param email 
 * @returns 
 */
async function createUser(name: UserSchema['name'], email: UserSchema['email']): Promise<UserSchema | undefined> {
  const reqBody = { name, email } as UserHTTP.CreateRequest;
  const response = await httpPOST<UserHTTP.CreateRequest, UserHTTP.CreateResponse>('/api/user/create', reqBody);
  return response.user;
}

/**
 * 
 * @param id 
 * @returns 
 */
async function readUser(id: UserSchema['id']): Promise<UserSchema | undefined> {
  const reqQuery = { id } as UserHTTP.ReadRequest;
  const response = await httpGET<UserHTTP.ReadRequest, UserHTTP.ReadResponse>('/api/user/read', reqQuery);
  return response.user;
}

/**
 * 
 * @param id 
 * @returns 
 */
async function readCurrentUser(): Promise<UserSchema | undefined> {
  const reqQuery = {} as UserHTTP.ReadCurrentResponse;
  const response = await httpGET<UserHTTP.ReadCurrentRequest, UserHTTP.ReadCurrentResponse>('/api/user/read/current', reqQuery);
  return response.user;
}

/**
 * 
 * @param name 
 * @returns 
 */
async function updateName(name: UserSchema['name']): Promise<boolean> {
  const reqBody = { name } as UserHTTP.UpdateNameRequest;
  const response = await httpPOST<UserHTTP.UpdateNameRequest, UserHTTP.UpdateResponse>('/api/user/update/name', reqBody);
  return response.success;
}

/**
 * 
 * @param email 
 * @returns 
 */
async function updateEmail(email: UserSchema['email']): Promise<boolean> {
  const reqBody = { email } as UserHTTP.UpdateEmailRequest;
  const response = await httpPOST<UserHTTP.UpdateEmailRequest, UserHTTP.UpdateResponse>('/api/user/update/email', reqBody);
  return response.success;
}

/**
 * 
 * @param color 
 * @returns 
 */
async function updateColor(color: UserSchema['color']): Promise<boolean> {
  const reqBody = { color } as UserHTTP.UpdateColorRequest;
  const response = await httpPOST<UserHTTP.UpdateColorRequest, UserHTTP.UpdateResponse>('/api/user/update/color', reqBody);
  return response.success;
}

/**
 * 
 * @param profilePicture 
 * @returns 
 */
async function updateProfilePicture(profilePicture: UserSchema['profilePicture']): Promise<boolean> {
  const reqBody = { profilePicture } as UserHTTP.UpdateProfilePictureRequest;
  const response = await httpPOST<UserHTTP.UpdateProfilePictureRequest, UserHTTP.UpdateResponse>('/api/user/update/profilepicture', reqBody);
  return response.success;
}

/**
 * 
 * @param userType 
 * @returns 
 */
async function updateUserType(userType: UserSchema['userType']): Promise<boolean> {
  const reqBody = { userType } as UserHTTP.UpdateUserTypeRequest;
  const response = await httpPOST<UserHTTP.UpdateUserTypeRequest, UserHTTP.UpdateResponse>('/api/user/update/usertype', reqBody);
  return response.success;
}

/**
 * 
 * @param userRole 
 * @returns 
 */
async function updateUserRole(userRole: UserSchema['userRole']): Promise<boolean> {
  const reqBody = { userRole } as UserHTTP.UpdateUserRoleRequest;
  const response = await httpPOST<UserHTTP.UpdateUserRoleRequest, UserHTTP.UpdateResponse>('/api/user/update/userrole', reqBody);
  return response.success;
}

/**
 * 
 * @param id 
 * @returns 
 */
async function deleteUser(id: UserSchema['id']): Promise<boolean> {
  const reqBody = { id } as UserHTTP.DeleteRequest;
  const response = await httpDELETE<UserHTTP.DeleteRequest, UserHTTP.DeleteResponse>('/api/user/delete', reqBody);
  return response.success;
}

/**
 * User HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const UserHTTPService = {
  createUser,
  readUser,
  readCurrentUser,
  updateName,
  updateEmail,
  updateColor,
  updateProfilePicture,
  updateUserRole,
  updateUserType,
  deleteUser
};
