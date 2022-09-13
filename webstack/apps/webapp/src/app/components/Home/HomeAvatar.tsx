/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useDisclosure, useColorMode, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { useAuth, useUser, EditUserModal, initials, EnterBoardByIdModal } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';
import { MdInput, MdInvertColors, MdManageAccounts, MdOutlineLogout } from 'react-icons/md';

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
  const { isOpen: boardIsOpen, onOpen: boardOnOpen, onClose: boardOnClose } = useDisclosure();

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
          <MenuItem onClick={editOnOpen} icon={<MdManageAccounts fontSize="24px" />}>
            Account
          </MenuItem>
          <MenuItem onClick={toggleColorMode} icon={<MdInvertColors fontSize="24px" />}>
            Color Mode
          </MenuItem>
          <MenuItem onClick={boardOnOpen} icon={<MdInput fontSize="24px" />}>
            Enter Board by Id
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
