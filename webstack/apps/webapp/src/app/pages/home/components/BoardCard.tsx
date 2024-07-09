/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  useColorModeValue,
  IconButton,
  Box,
  Text,
  useDisclosure,
  Icon,
  Tooltip,
  useToast,
  Avatar,
  AvatarBadge,
  AvatarGroup,
} from '@chakra-ui/react';
import { MdLock, MdStar, MdExitToApp, MdLink, MdStarOutline, MdSettings, MdInfo } from 'react-icons/md';

import {
  EnterBoardModal,
  useHexColor,
  useUser,
  useUsersStore,
  copyBoardUrlToClipboard,
  EditBoardModal,
  BoardInformationModal,
} from '@sage3/frontend';
import { Board, Presence } from '@sage3/shared/types';
import { BoardPreview } from './BoardPreview';
import { UserPresenceIcons } from './UserPresenceIcons';
import { useState } from 'react';

export function BoardCard(props: { board: Board; selected: boolean; onClick: (board: Board) => void; usersPresent: Presence[] }) {
  const { user, saveBoard, removeBoard } = useUser();
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Toast to inform user that they are not a member of a room
  const toast = useToast();

  // const backgroundColorValue = useColorModeValue(`${boardColor}.200`, `${boardColor}.800`);
  const backgroundColorValue = useColorModeValue(`${props.board.data.color}`, `${props.board.data.color}`);
  const backgroundColor = useHexColor(backgroundColorValue);
  const borderColorValue = useColorModeValue(`${props.board.data.color}.300`, `${props.board.data.color}.300`);
  const borderColor = useHexColor(borderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);
  // const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  // const borderColorG = useHexColor(borderColorGray);

  const savedBoards = user?.data.savedBoards || [];
  const isFavorite = user && savedBoards.includes(props.board._id);
  const boardColor = props.selected ? undefined : props.board.data.color;

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const handleFavorite = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    const boardId = props.board._id;
    if (user && removeBoard && saveBoard) {
      savedBoards.includes(boardId) ? removeBoard(boardId) : saveBoard(boardId);
    }
  };

  const handleSettings = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    editBoardModalOnOpen();
  };

  const handleInformation = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    boardInformationModalOnOpen();
  };

  // Copy a sharable link to the user's os clipboard
  const handleCopyLink = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    const roomId = board.data.roomId;
    const boardId = board._id;
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

  // Disclosure
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: editBoardModalIsOpen, onOpen: editBoardModalOnOpen, onClose: editBoardModalOnClose } = useDisclosure();
  const {
    isOpen: boardInformationModalIsOpen,
    onOpen: boardInformationModalOnOpen,
    onClose: boardInformationModalOnClose,
  } = useDisclosure();

  // Enter Board
  const handleEnterBoard = (ev: any) => {
    ev.stopPropagation();
    onOpen();
  };

  // prevent propagation of double click (i.e., favorite, unfavorite in quick succession)
  const handleBlockDoubleClick = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <Box
        background={'gray.800'}
        p="2"
        px="2"
        display="grid"
        gridTemplateAreas="'preview preview' 'name options'"
        gridTemplateColumns="1fr auto"
        justifyContent={'space-between'}
        alignItems={'center'}
        onClick={handleEnterBoard}
        borderRadius="md"
        // border={`2px solid ${props.selected ? backgroundColor : 'transparent'}`}
        boxSizing="border-box"
        width="400px"
        height="300px"
        transition={'all 0.2s ease-in-out'}
        cursor="pointer"
        _hover={{ transform: 'scale(1.02)' }}
        // onDoubleClick={handleEnterBoard}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Box gridArea="preview">
          <Box display="flex">
            <Box overflow="absolute" height={0} width="100%" zIndex={1} transform={'translate(5px, 180px)'}>
              <UserPresenceIcons
                usersPresent={props.usersPresent}
                maxUsersDisplayed={5}
                anonymousNames={props.board.data.isPrivate}
                overflow="hidden"
                width={370}
                height={35}
              />
            </Box>
          </Box>
          <BoardPreview board={props.board} width={380} height={220} isSelected={props.selected} />
        </Box>

        <EnterBoardModal board={props.board} isOpen={isOpen} onClose={onClose} />

        <Box display="flex" flexDir="column" pl="1" width="220px">
          <Box
            overflow="hidden"
            textOverflow={'ellipsis'}
            whiteSpace={'nowrap'}
            mr="2"
            fontSize="lg"
            fontWeight={'bold'}
            color={borderColorValue}
          >
            {props.board.data.name}
          </Box>
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={borderColorValue}>
            {props.board.data.description}
          </Box>
        </Box>

        <Box display="flex" alignItems={'center'}>
          {/* {props.usersPresent > 0 &&
          <Tooltip placement="top" hasArrow={true} label={'Number of users'} openDelay={400} ml="1">
            <Text color={borderColor} fontSize="xl" fontWeight="bold" mx="1">
              {props.usersPresent}
            </Text>
          </Tooltip>} */}

          <Tooltip
            placement="top"
            hasArrow={true}
            label={isFavorite ? 'Unfavorite this board' : 'Favorite this board'}
            openDelay={400}
            ml="1"
          >
            <IconButton
              size="sm"
              variant={'ghost'}
              colorScheme={boardColor}
              aria-label="enter-board"
              fontSize="xl"
              onClick={handleFavorite}
              onDoubleClick={handleBlockDoubleClick}
              icon={isFavorite ? <MdStar /> : <MdStarOutline />}
            ></IconButton>
          </Tooltip>

          <Tooltip placement="top" hasArrow={true} label={"Copy this board's link"} openDelay={400} ml="1">
            <IconButton
              size="sm"
              variant={'ghost'}
              colorScheme={boardColor}
              // opacity={isHovered ? 1 : 0}
              aria-label="enter-board"
              fontSize="xl"
              onClick={(e) => {
                handleCopyLink(e, props.board);
              }}
              onDoubleClick={handleBlockDoubleClick}
              icon={<MdLink />}
            ></IconButton>
          </Tooltip>

          {props.board.data.ownerId === user?._id && (
            <Tooltip placement="top" hasArrow={true} label={'Edit this board'} openDelay={400} ml="1">
              <IconButton
                size="sm"
                variant={'ghost'}
                colorScheme={boardColor}
                aria-label="enter-board"
                fontSize="xl"
                onClick={handleSettings}
                onDoubleClick={handleBlockDoubleClick}
                icon={<MdSettings />}
              ></IconButton>
            </Tooltip>
          )}

          <Tooltip placement="top" hasArrow={true} label={'More Information'} openDelay={400} ml="1">
            <IconButton
              size="sm"
              variant={'ghost'}
              colorScheme={boardColor}
              aria-label="enter-board"
              fontSize="xl"
              onClick={handleInformation}
              onDoubleClick={handleBlockDoubleClick}
              icon={<MdInfo />}
            ></IconButton>
          </Tooltip>

          {/* <Tooltip placement="top" hasArrow={true} label={'Enter this board'} openDelay={400} ml="1">
            <IconButton
              size="sm"
              variant={'ghost'}
              colorScheme={boardColor}
              aria-label="enter-board"
              fontSize="xl"
              onClick={handleEnterBoard}
              icon={<MdExitToApp />}
            ></IconButton>
          </Tooltip> */}
        </Box>
      </Box>
      <EditBoardModal
        isOpen={editBoardModalIsOpen}
        onOpen={editBoardModalOnOpen}
        onClose={editBoardModalOnClose}
        board={props.board}
      ></EditBoardModal>
      <BoardInformationModal
        isOpen={boardInformationModalIsOpen}
        onOpen={boardInformationModalOnOpen}
        onClose={boardInformationModalOnClose}
        board={props.board}
      ></BoardInformationModal>
    </>
  );
}
