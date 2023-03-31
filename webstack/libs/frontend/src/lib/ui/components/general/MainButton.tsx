/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useDisclosure, useColorMode, Menu, MenuButton, MenuList, MenuItem, Button, useToast, MenuDivider } from '@chakra-ui/react';
import {
  MdOutlineGridOn,
  MdAccountCircle,
  MdArrowBack,
  MdInvertColors,
  MdLink,
  MdManageAccounts,
  MdOutlineLogout,
  MdOutlineVpnKey,
  MdHelp,
} from 'react-icons/md';
import { HiPuzzle } from 'react-icons/hi';

import {
  useAuth,
  useUser,
  EditUserModal,
  EnterBoardByIdModal,
  AboutModal,
  copyBoardUrlToClipboard,
  useRouteNav,
  PluginModal,
} from '@sage3/frontend';
import { useEffect, useState } from 'react';
import { OpenConfiguration } from '@sage3/shared/types';

type MainButtonProps = {
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  backToRoom?: () => void;
  boardInfo?: { roomId: string; boardId: string };
  config: OpenConfiguration;
};
/**
 * Main (StartMenu Button) component
 *
 * @export
 * @returns
 */
export function MainButton(props: MainButtonProps) {
  const { user } = useUser();
  const { logout } = useAuth();
  const { toggleColorMode, colorMode } = useColorMode();
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure();
  const { isOpen: boardIsOpen, onOpen: boardOnOpen, onClose: boardOnClose } = useDisclosure();
  const { isOpen: aboutIsOpen, onOpen: aboutOnOpen, onClose: aboutOnClose } = useDisclosure();
  const { isOpen: pluginIsOpen, onOpen: pluginOnOpen, onClose: pluginOnClose } = useDisclosure();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const { toAdmin } = useRouteNav();

  useEffect(() => {
    if (user && props.config) {
      if (props.config.admins) {
        setIsAdmin(props.config.admins.includes(user.data.email));
      }
    }
  }, [user, props.config]);

  const isWall = user?.data.userType === 'wall';

  const toast = useToast();
  // Copy a sharable link to the user's os clipboard
  const handleCopyLink = (e: React.MouseEvent) => {
    if (!props.boardInfo) return;
    e.stopPropagation();
    // make it a sage3:// protocol link
    copyBoardUrlToClipboard(props.boardInfo.roomId, props.boardInfo.boardId);
    toast({
      title: 'Success',
      description: `Sharable Board link copied to clipboard.`,
      duration: 3000,
      isClosable: true,
      status: 'success',
    });
  };

  const openAdmin = () => {
    toAdmin();
  };

  const openAbout = () => {
    aboutOnOpen();
  };

  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          size="sm"
          variant={props.buttonStyle ? props.buttonStyle : 'outline'}
          colorScheme={user?.data.color ? user.data.color : 'white'}
          leftIcon={isWall ? <MdOutlineGridOn fontSize="18px" /> : <MdAccountCircle fontSize="18px" />}
        >
          {user ? user.data.name : ''}
        </MenuButton>
        <MenuList>
          <MenuItem onClick={editOnOpen} icon={<MdManageAccounts fontSize="24px" />}>
            Account
          </MenuItem>
          {isAdmin && (
            <MenuItem onClick={openAdmin} icon={<MdOutlineVpnKey fontSize="24px" />}>
              Admin Page
            </MenuItem>
          )}
          {props.config?.features?.plugins && (
            <MenuItem onClick={pluginOnOpen} icon={<HiPuzzle fontSize="24px" />}>
              Plugins
            </MenuItem>
          )}
          <MenuItem onClick={toggleColorMode} icon={<MdInvertColors fontSize="24px" />}>
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </MenuItem>

          <MenuDivider />
          {props.boardInfo && (
            <MenuItem onClick={handleCopyLink} icon={<MdLink fontSize="24px" />}>
              Copy Board Link
            </MenuItem>
          )}
          {props.backToRoom && (
            <>
              <MenuItem onClick={props.backToRoom} icon={<MdArrowBack fontSize="24px" />}>
                Back to Room
              </MenuItem>
              <MenuDivider />
            </>
          )}

          <MenuItem onClick={openAbout} icon={<MdHelp fontSize="24px" />}>
            About
          </MenuItem>

          <MenuItem onClick={logout} icon={<MdOutlineLogout fontSize="24px" />}>
            Logout
          </MenuItem>
        </MenuList>
      </Menu>
      <EditUserModal isOpen={editIsOpen} onOpen={editOnOpen} onClose={editOnClose}></EditUserModal>
      <EnterBoardByIdModal isOpen={boardIsOpen} onOpen={boardOnOpen} onClose={boardOnClose}></EnterBoardByIdModal>
      <AboutModal isOpen={aboutIsOpen} onClose={aboutOnClose}></AboutModal>
      <PluginModal isOpen={pluginIsOpen} onOpen={pluginOnOpen} onClose={pluginOnClose} />
    </>
  );
}
