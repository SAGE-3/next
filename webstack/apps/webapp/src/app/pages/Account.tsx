/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useDisclosure } from '@chakra-ui/react';
import { CreateUserModal, useUser } from '@sage3/frontend';
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function AccountPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  const authNavCheck = useCallback(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);


  useEffect(() => {
    authNavCheck();
  }, [authNavCheck]);


  return (
    <div>
      <h1>Account Creation Page</h1>
      <CreateUserModal />
    </div>
  );
}
