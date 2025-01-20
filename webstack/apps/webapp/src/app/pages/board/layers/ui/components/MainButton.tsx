/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

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
  MenuGroup,
  Text,
} from '@chakra-ui/react';

import {
  MdArrowBack,
  MdInvertColors,
  MdLink,
  MdManageAccounts,
  MdOutlineLogout,
  MdOutlineVpnKey,
  MdInfoOutline,
  MdArrowForward,
  MdLock,
  MdLockOpen,
  MdBugReport,
  MdSearch,
  MdRemoveRedEye,
  MdHelpOutline,
  MdPerson,
} from 'react-icons/md';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { IoSparklesSharp } from 'react-icons/io5';
import { RxGrid } from 'react-icons/rx';

import {
  useAuth,
  useUser,
  EditUserModal,
  AboutModal,
  copyBoardUrlToClipboard,
  useRouteNav,
  useBoardStore,
  EnterBoardModal,
  useHexColor,
  UserSearchModal,
  useAbility,
  FeedbackModal,
  useConfigStore,
  HelpModal,
  EditVisibilityModal,
  Alfred,
  truncateWithEllipsis,
  IntelligenceModal,
} from '@sage3/frontend';
import { IntelligenceMenu } from './Menus';

import { Board, OpenConfiguration } from '@sage3/shared/types';

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
  const longName = user ? truncateWithEllipsis(user.data.name, 20) : '';
  const shortName = user ? truncateWithEllipsis(user.data.name, 10) : '';
  const isWall = user?.data.userType === 'wall';

  const userColorValue = user?.data.color ? user.data.color : 'teal';
  const userColor = useHexColor(userColorValue);

  const config = useConfigStore((state) => state.config);
  const isProduction = config.production;
  const feedbackUrl = config.feedback ? config.feedback.url : null;

  // Track if the menu is open or not
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Abilities
  const canUpdateAccount = useAbility('update', 'users');

  const { logout } = useAuth();
  const { toggleColorMode, colorMode } = useColorMode();
  // Modal panels
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure();
  const { isOpen: aboutIsOpen, onOpen: aboutOnOpen, onClose: aboutOnClose } = useDisclosure();
  const { isOpen: userSearchIsOpen, onOpen: userSearchOnOpen, onClose: userSearchOnClose } = useDisclosure();
  const { isOpen: intelligenceIsOpen, onOpen: intelligenceOnOpen, onClose: intelligenceOnClose } = useDisclosure();

  // Alfred Modal
  const { isOpen: alfredIsOpen, onOpen: alfredOnOpen, onClose: alfredOnClose } = useDisclosure();
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  // Presence settings modal
  const { isOpen: visibilityIsOpen, onOpen: visibilityOnOpen, onClose: visibilityOnClose } = useDisclosure();

  const handleHelpOpen = () => {
    helpOnOpen();
  };
  const handleAlfredOpen = () => {
    alfredOnOpen();
  };
  const handlePresenceSettingsOpen = () => {
    visibilityOnOpen();
  };

  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Boards
  const boards = useBoardStore((state) => state.boards);
  boards.sort((a, b) => a.data.name.localeCompare(b.data.name));
  const { boardId } = useParams();
  const bgColorName = useColorModeValue('blackAlpha.300', 'whiteAlpha.200');
  const bgColor = useHexColor(bgColorName);
  const lockColor = useHexColor('red');
  const unlockColor = useHexColor('green');

  // Nav
  const { toAdmin } = useRouteNav();

  // FeedbackModel
  const { isOpen: feedbackIsOpen, onOpen: feedbackOnOpen, onClose: feedbackOnClose } = useDisclosure();

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

  const toast = useToast();
  // Copy a sharable link to the user's os clipboard
  const handleCopyLink = (e: React.MouseEvent, board?: Board) => {
    if (!props.boardInfo) return;
    e.stopPropagation();
    const roomId = board ? board.data.roomId : props.boardInfo.roomId;
    const boardId = board ? board._id : props.boardInfo.boardId;
    // make it a https:// protocol link
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

      {/* Help Modal */}
      <HelpModal onClose={helpOnClose} isOpen={helpIsOpen}></HelpModal>

      {/* Presence settings modal dialog */}
      <EditVisibilityModal isOpen={visibilityIsOpen} onClose={visibilityOnClose} />

      {/* Alfred modal dialog */}
      {props.boardInfo && (
        <Alfred boardId={props.boardInfo.boardId} roomId={props.boardInfo.roomId} isOpen={alfredIsOpen} onClose={alfredOnClose} />
      )}

      {/* Feedback modal */}
      {feedbackUrl && <FeedbackModal isOpen={feedbackIsOpen} onClose={feedbackOnClose} url={feedbackUrl} />}

      <Menu preventOverflow={false} placement="top-start" onOpen={() => setMenuOpen(true)} onClose={() => setMenuOpen(false)}>
        {props.boardInfo ? (
          <Tooltip label="Main Menu" aria-label="menu" placement="top" hasArrow={true} openDelay={400}>
            <MenuButton
              as={Button}
              size="sm"
              maxWidth="150px"
              variant={props.buttonStyle ? props.buttonStyle : 'outline'}
              colorScheme={user?.data.color ? user.data.color : 'white'}
              p={2}
            >
              <Box
                textOverflow={'ellipsis'}
                overflow={'hidden'}
                fontSize="sm"
                alignContent={'center'}
                display="flex"
                alignItems={'center'}
                gap="1"
              >
                {isWall ? <RxGrid /> : <MdPerson />}

                {shortName}
              </Box>
            </MenuButton>
          </Tooltip>
        ) : (
          <MenuButton
            marginTop="auto"
            display="flex"
            as={Box}
            backgroundColor={userColor}
            height="40px"
            alignItems={'center'}
            justifyContent={'left'}
            borderRadius="10"
            width="100%"
            transition={'all 0.5s'}
            _hover={{ cursor: 'pointer' }}
          >
            <Box display="flex" justifyContent={'space-between'} alignItems={'center'}>
              <Box display="flex" pl="4" gap="1" alignItems={'center'}>
                {isWall ? <RxGrid /> : <MdPerson />}
                <Text fontSize="md" fontWeight={'bold'} whiteSpace={'nowrap'} textOverflow={'clip'}>
                  {longName}
                </Text>
              </Box>
              <Box pr="3" fontSize="3xl">
                {menuOpen ? <BiChevronUp /> : <BiChevronDown />}
              </Box>
            </Box>
          </MenuButton>
        )}

        <MenuList maxHeight="60vh" overflowY={'auto'} overflowX="clip" width={props.boardInfo ? '100%' : '20%'}
          minWidth="220px" maxWidth="400px" p="2px" m="0">
          <MenuGroup title="SAGE3" p="0" m="1">
            {props.boardInfo && (
              <MenuItem py="1px" m="0" onClick={handleHelpOpen} icon={<MdHelpOutline size="24px" />} justifyContent="right">
                {' '}
                Help{' '}
              </MenuItem>
            )}
            <MenuItem onClick={openAbout} icon={<MdInfoOutline fontSize="24px" />} py="1px" m="0">
              {' '}
              About{' '}
            </MenuItem>
            {props.boardInfo && (
              <MenuItem py="1px" m="0" justifyContent="right" onClick={handleAlfredOpen} icon={<MdSearch fontSize="24px" />}>
                {' '}
                Search{' '}
              </MenuItem>
            )}
            {feedbackUrl && (
              <MenuItem onClick={feedbackOnOpen} icon={<MdBugReport fontSize="24px" />} py="1px" m="0">
                Feedback
              </MenuItem>
            )}
          </MenuGroup>

          <MenuDivider />

          {props.boardInfo && (
            <MenuGroup title="Navigation" m="1">
              <MenuItem onClick={(e) => handleCopyLink(e)} icon={<MdLink fontSize="24px" />} py="1px" m="0">
                Copy Board Link
              </MenuItem>
              <Menu isOpen={boardListOpen} placement="right-end" onClose={closeBoardList}>
                <MenuButton
                  as={MenuItem}
                  icon={<MdArrowForward fontSize="24px" />}
                  onClick={toggleBoardList}
                  _hover={{ background: bgColor }}
                  py="1px"
                  m="0"
                >
                  Go To Board
                </MenuButton>
                <MenuList maxHeight="50vh" overflowY={'auto'} overflowX="clip" width="280px">
                  <MenuGroup title={`${props.boardInfo.roomName} Boards`}>
                    {boards.map(
                      (board) =>
                        board._id !== boardId && (
                          <MenuItem
                            as={Box}
                            key={board._id}
                            display="flex"
                            justifyContent={'space-between'}
                            p="0"
                            m="0"
                            _hover={{ background: 'none' }}
                            height={'32px'}
                            lineHeight={'32px'}
                          >
                            <Box
                              width="80%"
                              whiteSpace="nowrap"
                              overflow="hidden"
                              onClick={() => goToBoard(board)}
                              _hover={{ cursor: 'pointer', background: bgColor }}
                              textOverflow={'ellipsis'}
                              height={'32px'}
                              lineHeight={'32px'}
                            >
                              <IconButton
                                aria-label="LockBoard"
                                fontSize="lg"
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

                            <Tooltip label="Copy Board Link" placement="top" hasArrow openDelay={700}>
                              <IconButton
                                aria-label="Board Edit"
                                fontSize="lg"
                                variant="unstlyed"
                                m="0"
                                p="0"
                                _hover={{ transform: 'scale(1.1)' }}
                                onClick={(e) => handleCopyLink(e, board)}
                                icon={<MdLink />}
                              />
                            </Tooltip>
                          </MenuItem>
                        )
                    )}
                  </MenuGroup>
                </MenuList>
              </Menu>
            </MenuGroup>
          )}
          {props.backToRoom && (
            <>
              <MenuItem onClick={props.backToRoom} icon={<MdArrowBack fontSize="24px" />} py="1px" m="0">
                Back to Room
              </MenuItem>
              <MenuDivider />
            </>
          )}

          <MenuGroup title="Settings" m="1">
            <MenuItem onClick={editOnOpen} isDisabled={!canUpdateAccount} icon={<MdManageAccounts fontSize="24px" />} py="1px" m="0">
              Account
            </MenuItem>

            <MenuItem onClick={intelligenceOnOpen} icon={<IoSparklesSharp fontSize="24px" />} py="1px" m="0">
              Intelligence
            </MenuItem>

            <MenuItem onClick={toggleColorMode} icon={<MdInvertColors fontSize="24px" />} py="1px" m="0">
              {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </MenuItem>
            <MenuItem onClick={handlePresenceSettingsOpen} icon={<MdRemoveRedEye fontSize="24px" />} justifyContent="right" py="1px" m="0">
              Visibility
            </MenuItem>

            {(isAdmin || !isProduction) && (
              <MenuItem onClick={openAdmin} icon={<MdOutlineVpnKey fontSize="24px" />} py="1px" m="0">
                Admin Page
              </MenuItem>
            )}

            <MenuItem onClick={logout} icon={<MdOutlineLogout fontSize="24px" />} py="1px" m="0">
              Logout
            </MenuItem>
          </MenuGroup>
        </MenuList>
      </Menu>

      <EditUserModal isOpen={editIsOpen} onOpen={editOnOpen} onClose={editOnClose}></EditUserModal>
      <AboutModal isOpen={aboutIsOpen} onClose={aboutOnClose}></AboutModal>
      <IntelligenceModal isOpen={intelligenceIsOpen} onOpen={intelligenceOnOpen} onClose={intelligenceOnClose}>
        <IntelligenceMenu notificationCount={0} />
      </IntelligenceModal>

      {
        // The test forces the recreation of the modal when the userSearchIsOpen state changes
        userSearchIsOpen && <UserSearchModal isOpen={userSearchIsOpen} onOpen={userSearchOnOpen} onClose={userSearchOnClose} />
      }
    </>
  );
}
