/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, useDisclosure } from "@chakra-ui/react";
import { useUserStore, AuthHTTPService, CreateUserModal, EditUserModal, useAuth } from "@sage3/frontend";
import { useState, useEffect } from "react";

export type HeaderProps = {
  title: string
}

export function Header(props: HeaderProps) {
  const auth = useAuth();

  const user = useUserStore((state) => state.user);
  const sub = useUserStore((state) => state.subscribeToUser);

  const { isOpen: createIsOpen, onOpen: createOnOpen, onClose: createOnClose } = useDisclosure()
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure()

  useEffect(() => {
    if (!user) {
      if (auth.auth) {
        sub(auth.auth?.id);
      }
      createOnOpen()
    } else {
      createOnClose();
    }
  }, [createOnClose, createOnOpen, user, sub, auth.auth]);

  return (
    <Box display="flex" flexDirection="row" flexWrap="nowrap" width="100vw">
      <h3>
        {props.title} - {user?.name}
      </h3>

      <Button onClick={editOnOpen}>EDIT</Button>

      <Button onClick={AuthHTTPService.logout}>Logout</Button>
      <CreateUserModal isOpen={createIsOpen} onOpen={createOnOpen} onClose={createOnClose} ></CreateUserModal>
      <EditUserModal isOpen={editIsOpen} onOpen={editOnOpen} onClose={editOnClose}></EditUserModal>
    </Box>
  )

}