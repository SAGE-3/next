/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, useDisclosure, Text, useColorMode } from "@chakra-ui/react";
import { useUserStore, AuthHTTPService, useAuth } from "@sage3/frontend";
import { EditUserModal } from "@sage3/frontend";
import { useEffect } from "react";

export type HeaderProps = {
  title: string
}

export function Header(props: HeaderProps) {
  const auth = useAuth();

  const user = useUserStore((state) => state.user);
  const sub = useUserStore((state) => state.subscribeToUser);

  const { colorMode, toggleColorMode } = useColorMode()

  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure()

  useEffect(() => {
    if (!user) {
      if (auth.auth) {
        sub(auth.auth?.id);
      }
      editOnOpen();
    } else {
      editOnClose();
    }
  }, [user, sub, auth.auth, editOnOpen, editOnClose]);

  return (
    <Box display="flex" flexFlow="row nowrap" justifyContent="space-between" alignItems="baseline" mx="2">
      <Box display="flex" flex="1 1 0" justifyContent="flex-start" alignItems="baseline"></Box>
      <Box display="flex" flex="1 1 0" justifyContent="center" alignItems="baseline">
        <Text fontSize='4xl' >{props.title}</Text>
      </Box>
      <Box display="flex" flex="1 1 0" justifyContent="flex-end" alignItems="baseline">
        {user?.data.name}
        <Button onClick={toggleColorMode}>{colorMode === 'light' ? 'Dark' : 'Light'}</Button>
        <Button onClick={editOnOpen}>EDIT</Button>
        <Button onClick={AuthHTTPService.logout}>Logout</Button>
      </Box>
      <EditUserModal isOpen={editIsOpen} onOpen={editOnOpen} onClose={editOnClose}></EditUserModal>
    </Box>
  )

}