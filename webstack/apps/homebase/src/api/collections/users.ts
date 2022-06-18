/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UserSchema } from "@sage3/shared/types";
import { SAGECollection } from "@sage3/backend";

class SAGE3UsersCollection extends SAGECollection<UserSchema> {
  constructor() {
    super("USERS", {
      name: '',
      email: '',
    });
  }
}

export const UsersCollection = new SAGE3UsersCollection();