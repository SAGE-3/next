/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { UserSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';
import { config } from '../../config';

class SAGE3UsersCollection extends SAGE3Collection<UserSchema> {
  constructor() {
    super('USERS', {
      name: '',
      email: '',
    });

    const router = sageRouter<UserSchema>(this);

    router.post('/create', async ({ body, user }, res) => {
      let doc = null;
      const id = (user as any).id;

      // Check if user email is in admin list
      if (config.auth.admins.includes(body.email)) body.userRole = 'admin';

      if (user) {
        doc = await this.add(body, id, id);
      }
      if (doc) res.status(200).send({ success: true, data: [doc] });
      else res.status(500).send({ success: false, message: 'Failed to create user.' });
    });

    this.httpRouter = router;
  }
}

export const UsersCollection = new SAGE3UsersCollection();
