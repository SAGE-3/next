/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useDisclosure, useColorMode, Menu, MenuButton, MenuList, MenuItem, Button, useToast } from '@chakra-ui/react';
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
  MdNewLabel,
} from 'react-icons/md';

import {
  useAuth,
  useUser,
  EditUserModal,
  EnterBoardByIdModal,
  AboutModal,
  copyBoardUrlToClipboard,
  GetConfiguration,
  useRouteNav,
  PluginUploadModal,
} from '@sage3/frontend';
import { useEffect, useState } from 'react';

type MainButtonProps = {
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  backToRoom?: () => void;
  boardInfo?: { roomId: string; boardId: string };
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
    const fetchAdmins = async () => {
      if (user) {
        const config = await GetConfiguration();
        setIsAdmin(config.admins.includes(user.data.email));
      }
    };

    fetchAdmins();
  }, [user]);

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
          <MenuItem onClick={toggleColorMode} icon={<MdInvertColors fontSize="24px" />}>
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </MenuItem>
          {props.boardInfo && (
            <MenuItem onClick={handleCopyLink} icon={<MdLink fontSize="24px" />}>
              Copy Board Link
            </MenuItem>
          )}
          {props.backToRoom && (
            <MenuItem onClick={props.backToRoom} icon={<MdArrowBack fontSize="24px" />}>
              Back to Room
            </MenuItem>
          )}
          <MenuItem onClick={pluginOnOpen} icon={<MdNewLabel fontSize="24px" />}>
            Upload Plugin App
          </MenuItem>
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
      <PluginUploadModal isOpen={pluginIsOpen} onOpen={pluginOnOpen} onClose={pluginOnClose} />
    </>
  );
}
