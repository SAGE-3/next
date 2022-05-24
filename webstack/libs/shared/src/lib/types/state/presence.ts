/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UserRole, UserType } from "../schemas";
import { Position } from "./position";
import { Size } from "./size";
import { TimeZone } from "./timezone";

/**
 * Used for UserPrsesnce within SAGE3.
 */
export type UserPresence = {
  id: string;
  color: string;
  name: string;
  boardId: string;
  cursor: Position;
  viewPosition: Position;
  viewSize: Size;
  timeZone: TimeZone;
  userType: UserRole;
  userRole: UserType;
};

