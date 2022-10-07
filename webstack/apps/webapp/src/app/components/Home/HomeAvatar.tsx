/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useDisclosure, useColorMode, Avatar, Menu, MenuButton, MenuList, MenuItem, Box, Button } from '@chakra-ui/react';
import { useAuth, useUser, EditUserModal, initials, EnterBoardByIdModal } from '@sage3/frontend';
import { MdAccountCircle, MdInput, MdInvertColors, MdManageAccounts, MdOutlineLogout } from 'react-icons/md';

/**
 * HomeAvatar component
 *
 * @export
 * @returns
 */
export function HomeAvatar() {
  const { user } = useUser();
  const { logout } = useAuth();
  const { toggleColorMode, colorMode } = useColorMode();
  console.log(colorMode);
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure();
  const { isOpen: boardIsOpen, onOpen: boardOnOpen, onClose: boardOnClose } = useDisclosure();

  return (
    <>
      {' '}
      <Menu>
        <MenuButton
          as={Button}
          size="md"
          variant="outline"
          colorScheme={user?.data.color ? user.data.color : 'white'}
          leftIcon={<MdAccountCircle />}
        >
          {user ? user.data.name : ''}
        </MenuButton>
        <MenuList>
          <MenuItem onClick={editOnOpen} icon={<MdManageAccounts fontSize="24px" />}>
            Account
          </MenuItem>
          <MenuItem onClick={toggleColorMode} icon={<MdInvertColors fontSize="24px" />}>
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </MenuItem>
          <MenuItem onClick={logout} icon={<MdOutlineLogout fontSize="24px" />}>
            Logout
          </MenuItem>
        </MenuList>
      </Menu>
      <EditUserModal isOpen={editIsOpen} onOpen={editOnOpen} onClose={editOnClose}></EditUserModal>
      <EnterBoardByIdModal isOpen={boardIsOpen} onOpen={boardOnOpen} onClose={boardOnClose}></EnterBoardByIdModal>
    </>
  );
}
