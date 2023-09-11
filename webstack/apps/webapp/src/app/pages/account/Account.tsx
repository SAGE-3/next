/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';

import { CreateUserModal, useRouteNav, useUser } from '@sage3/frontend';
import { UserSchema } from '@sage3/shared/types';

/**
 * Account Creation page when a user first joins the application
 */
export function AccountPage() {
  // const { auth } = useAuth();
  const { user, create } = useUser();
  const { toHome } = useRouteNav();

  // If the user has been set, go to the homepage
  useEffect(() => {
    if (user) {
      toHome();
    }
  }, [user]);

  // Create a user
  const handleCreateUser = (user: UserSchema) => {
    if (create) {
      create(user);
    }
  };

  return <CreateUserModal createUser={handleCreateUser} />;
}
