/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from "zod";
import { SBDoc } from "./SBSchema";

const UserType = z.enum(["wall", "client"]);
export type UserType = z.infer<typeof UserType>;

const UserRole = z.enum(['admin', 'user', 'guest']);
export type UserRole = z.infer<typeof UserRole>;

/**
 * SAGE3 UserSchema
 * @interface UserSchema
 */
export const UserSchema = z.object({
  // Name of the user
  name: z.string(),
  // Email address of the user.
  email: z.string(),
  // Color representing the user.
  color: z.string(),
  // Picture of the user.
  profilePicture: z.string(),
  // Type of the user.
  userType: UserType,
  // Role of the user in SAGE3
  userRole: UserRole,

});

type UserData = z.infer<typeof UserSchema>;

export type User = SBDoc & { data: UserData };

