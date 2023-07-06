/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  useDisclosure,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useToast,
  MenuDivider,
  useColorModeValue,
  Box,
  IconButton,
  Tooltip,
  MenuOptionGroup,
  MenuGroup,
} from '@chakra-ui/react';
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
  MdArrowForward,
  MdLock,
  MdLockOpen,
  MdPeople,
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
  useBoardStore,
  EnterBoardModal,
  useHexColor,
  UserSearchModal,
} from '@sage3/frontend';
import { useEffect, useState } from 'react';
import { Board, OpenConfiguration } from '@sage3/shared/types';
import { useParams } from 'react-router';

type MainButtonProps = {
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  backToRoom?: () => void;
  boardInfo?: { roomId: string; boardId: string; boardName: string; roomName: string };
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
  // Modal panels
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure();
  const { isOpen: boardIsOpen, onOpen: boardOnOpen, onClose: boardOnClose } = useDisclosure();
  const { isOpen: aboutIsOpen, onOpen: aboutOnOpen, onClose: aboutOnClose } = useDisclosure();
  const { isOpen: pluginIsOpen, onOpen: pluginOnOpen, onClose: pluginOnClose } = useDisclosure();
  const { isOpen: userSearchIsOpen, onOpen: userSearchOnOpen, onClose: userSearchOnClose } = useDisclosure();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Boards
  const { boards } = useBoardStore((state) => state);
  boards.sort((a, b) => a.data.name.localeCompare(b.data.name));
  const { boardId } = useParams();
  const bgColorName = useColorModeValue('blackAlpha.300', 'whiteAlpha.200');
  const bgColor = useHexColor(bgColorName);
  const lockColor = useHexColor('red');
  const unlockColor = useHexColor('green');

  // Nav
  const { toAdmin } = useRouteNav();

  // Enter Board Modal
  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();
  const [enterBoard, setEnterBoard] = useState<Board | undefined>(undefined);

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
  const handleCopyLink = (e: React.MouseEvent, board?: Board) => {
    if (!props.boardInfo) return;
    e.stopPropagation();
    const roomId = board ? board.data.roomId : props.boardInfo.roomId;
    const boardId = board ? board._id : props.boardInfo.boardId;
    // make it a sage3:// protocol link
    copyBoardUrlToClipboard(roomId, boardId);
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

  const [boardListOpen, setBoardListOpen] = useState<boolean>(false);

  const openBoardList = () => {
    setBoardListOpen(true);
  };

  const closeBoardList = () => {
    if (boardListOpen) {
      setBoardListOpen(false);
    }
  };

  const toggleBoardList = () => {
    setBoardListOpen(!boardListOpen);
  };

  const goToBoard = (board: Board) => {
    setEnterBoard(board);
    enterBoardOnOpen();
  };

  const goToBoardFinish = () => {
    enterBoardOnClose();
  };

  return (
    <>
      {enterBoard && <EnterBoardModal board={enterBoard} isOpen={enterBoardIsOpen} onClose={goToBoardFinish} />}

      <Menu preventOverflow={false}>
        <MenuButton
          as={Button}
          size="sm"
          variant={props.buttonStyle ? props.buttonStyle : 'outline'}
          colorScheme={user?.data.color ? user.data.color : 'white'}
          leftIcon={isWall ? <MdOutlineGridOn fontSize="18px" /> : <MdAccountCircle fontSize="18px" />}
        >
          {user ? user.data.name : ''}
        </MenuButton>
        <MenuList maxHeight="50vh" overflowY={'scroll'} overflowX="clip">
          <MenuItem onClick={editOnOpen} icon={<MdManageAccounts fontSize="24px" />}>
            Account
          </MenuItem>
          {isAdmin && (
            <MenuItem onClick={openAdmin} icon={<MdOutlineVpnKey fontSize="24px" />}>
              Admin Page
            </MenuItem>
          )}

          <MenuItem onClick={userSearchOnOpen} icon={<MdPeople fontSize="24px" />}>
            Users
          </MenuItem>

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
            <MenuItem onClick={(e) => handleCopyLink(e)} icon={<MdLink fontSize="24px" />}>
              Copy Board Link
            </MenuItem>
          )}
          {props.boardInfo && (
            <Menu isOpen={boardListOpen} placement="right-end" onClose={closeBoardList}>
              <MenuButton
                as={MenuItem}
                icon={<MdArrowForward fontSize="24px" />}
                onPointerEnter={toggleBoardList}
                _hover={{ background: bgColor }}
              >
                Go To Board
              </MenuButton>
              <MenuList maxHeight="50vh" overflowY={'scroll'} overflowX="clip" width="300px">
                <MenuGroup title={`${props.boardInfo.roomName} Boards`}>
                  {boards.map(
                    (board) =>
                      board._id !== boardId && (
                        <MenuItem
                          as={Box}
                          key={board._id}
                          display="flex"
                          justifyContent={'space-between'}
                          py="0"
                          pl="0"
                          _hover={{ background: 'none' }}
                        >
                          <Box
                            width="80%"
                            whiteSpace="nowrap"
                            overflow="hidden"
                            onClick={() => goToBoard(board)}
                            _hover={{ cursor: 'pointer', background: bgColor }}
                            height="40px"
                            lineHeight={'40px'}
                            textOverflow={'ellipsis'}
                          >
                            <IconButton
                              aria-label="LockBoard"
                              fontSize="xl"
                              variant="unstlyed"
                              pointerEvents="none"
                              color={board.data.isPrivate ? lockColor : unlockColor}
                              m="0"
                              p="0"
                              _hover={{ cursor: 'initial' }}
                              icon={board.data.isPrivate ? <MdLock /> : <MdLockOpen />}
                            />
                            {board.data.name}
                          </Box>
                          {/* <Box display="flex" justifyContent={'space-between'} width="20%"> */}
                          <Tooltip label="Copy Board Link" placement="top" hasArrow openDelay={700}>
                            <IconButton
                              aria-label="Board Edit"
                              fontSize="2xl"
                              variant="unstlyed"
                              m="0"
                              p="0"
                              _hover={{ transform: 'scale(1.3)' }}
                              onClick={(e) => handleCopyLink(e, board)}
                              icon={<MdLink />}
                            />
                          </Tooltip>
                          {/* </Box> */}
                        </MenuItem>
                      )
                  )}
                </MenuGroup>
              </MenuList>
            </Menu>
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

      {
        // The test forces the recreation of the modal when the userSearchIsOpen state changes
        userSearchIsOpen &&
        <UserSearchModal isOpen={userSearchIsOpen} onOpen={userSearchOnOpen} onClose={userSearchOnClose} />
      }
    </>
  );
}
