/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const UserType = z.enum(['wall', 'client']);
export type UserType = z.infer<typeof UserType>;

const UserRole = z.enum(['admin', 'user', 'guest', 'spectator']);
export type UserRole = z.infer<typeof UserRole>;

/**
 * SAGE3 UserSchema
 * @interface UserSchema
 */
const schema = z.object({
  // Name of the user
  name: z.string(),
  // Email address of the user.
  email: z.string(),
  // Color representing the user.
  color: z.string(),
  // Picture of the user.
  profilePicture: z.string(),
  // Type of the user: wall, client
  userType: UserType,
  // Role of the user in SAGE3: admin, user, guest, spectator
  userRole: UserRole,
  // Saved Boards IDs of the user
  savedBoards: z.array(z.string()),
  // Recent Boards
  recentBoards: z.array(z.string()),
  // Settings
  settings: z.object({
    // Show the cursor of the user
    showCursor: z.boolean(),
    // Show other users cursors
    showOthersCursors: z.boolean(),
    // Show the viewport of the user
    showViewport: z.boolean(),
    // Show other users viewports
    showOthersViewports: z.boolean(),
  }),
});

export type UserSchema = z.infer<typeof schema>;

export type User = SBDoc & { data: UserSchema };
