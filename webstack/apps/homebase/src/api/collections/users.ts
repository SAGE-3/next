/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UserSchema } from "@sage3/shared/types";
import { SAGE3Collection } from "@sage3/backend";
import { SBAuthSchema } from "@sage3/sagebase";
import { randomSAGEColor } from '@sage3/shared';

class SAGE3UsersCollection extends SAGE3Collection<UserSchema> {
  constructor() {
    super("USERS", {
      name: '',
      email: '',
    });
  }

  public async checkAddUserAccount(auth: SBAuthSchema): Promise<boolean> {
    let user = await this.collection.docRef(auth.id).read();
    if (!user) {
      const newUser = {
        name: `Anonymous`,
        email: 'anon@anon.com',
        color: randomSAGEColor().name,
        userRole: (auth.provider === 'guest') ? 'guest' : 'user',
        userType: 'client',
        profilePicture: ''
      } as UserSchema;
      await this.collection.addDoc(newUser, auth.id);
      user = await this.collection.docRef(auth.id).read();
    }
    return (user !== undefined);
  }
}

export const UsersCollection = new SAGE3UsersCollection();