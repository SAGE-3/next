/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { CreateUserModal, useUser } from '@sage3/frontend';
import { UserSchema } from '@sage3/shared/types';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AccountPage() {
  const { user, create } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleCreateUser = (user: UserSchema) => {
    if (create) {
      create(user);
    }
  }

  return (
    <div>
      <h1>Account Creation Page</h1>
      <CreateUserModal createUser={handleCreateUser} />
    </div>
  );
}
