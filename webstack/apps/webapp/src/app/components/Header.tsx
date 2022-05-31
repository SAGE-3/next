/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button } from "@chakra-ui/react";
import { useUserStore, AuthHTTPService, CreateUserModal, EditUserModal } from "@sage3/frontend";
import { useState, useEffect } from "react";

export type HeaderProps = {
  title: string
}

export function Header(props: HeaderProps) {
  const user = useUserStore((state) => state.user);
  const subToUser = useUserStore((state) => state.subscribeToUser);

  const [newUserModal, setNewUserModal] = useState(false);
  const [editAccountModal, setEditAccountModal] = useState(false);

  useEffect(() => {
    async function subUser() {
      await subToUser();
      if (user === undefined) {
        setNewUserModal(true);
      } else {
        setNewUserModal(false);
      }
    }
    if (!user) {
      subUser();
    } else {
      setNewUserModal(false);
    }
  }, [subToUser, user, newUserModal]);

  return (
    <Box display="flex" flexDirection="row" flexWrap="nowrap" width="100vw">
      <h3>
        {props.title}
      </h3>

      <Button onClick={() => setEditAccountModal(true)}>EDIT</Button>

      <Button onClick={AuthHTTPService.logout}>Logout</Button>
      <CreateUserModal isOpen={newUserModal} onClose={() => setNewUserModal(false)}></CreateUserModal>
      <EditUserModal isOpen={editAccountModal} onClose={() => setEditAccountModal(false)}></EditUserModal>
    </Box>
  )

}