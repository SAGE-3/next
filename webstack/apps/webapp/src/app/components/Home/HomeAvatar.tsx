/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, useDisclosure, Text, useColorMode, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { useAuth, usePresenceStore, useUser, EditUserModal, initials } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';
import { MdAccountCircle, MdInvertColors, MdManageAccounts, MdOutlineLogout } from 'react-icons/md';

/**
 * HomeAvatar component
 *
 * @export
 * @returns
 */
export function HomeAvatar() {
  const { user } = useUser();
  const { logout } = useAuth();
  const { toggleColorMode } = useColorMode();
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure();

  return (
    <>
      <Menu>
        <MenuButton>
          {/* User Avatar */}
          <Avatar
            size="md"
            pointerEvents={'all'}
            name={user?.data.name}
            getInitials={initials}
            backgroundColor={user ? sageColorByName(user.data.color) : ''}
            color="white"
            border="2px solid white"
            mx={1}
          />
        </MenuButton>
        <MenuList>
          <MenuItem onClick={editOnOpen} icon={<MdManageAccounts fontSize="24px"/>} fontWeight="bold">Account</MenuItem>
          <MenuItem onClick={toggleColorMode} icon={<MdInvertColors fontSize="24px"/>} fontWeight="bold">Color Mode</MenuItem>
          <MenuItem onClick={logout} icon={<MdOutlineLogout fontSize="24px"/>} fontWeight="bold">Logout</MenuItem>
        </MenuList>
      </Menu>
      <EditUserModal isOpen={editIsOpen} onOpen={editOnOpen} onClose={editOnClose}></EditUserModal>
    </>
  );
}
