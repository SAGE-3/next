/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, useDisclosure, Tooltip, useToast, Icon, Fade } from '@chakra-ui/react';
import { MdStar, MdLink, MdStarOutline, MdSettings, MdInfo, MdLock, MdLockOpen } from 'react-icons/md';

import { EnterBoardModal, useHexColor, useUser, copyBoardUrlToClipboard, EditBoardModal, BoardInformationModal } from '@sage3/frontend';
import { Board, PresencePartial, Room } from '@sage3/shared/types';
import { BoardPreview } from './BoardPreview';
import { UserPresenceIcons } from './UserPresenceIcons';

// Board Card Props
interface BoardCardProps {
  board: Board;
  room: Room;
  selected: boolean;
  onClick: (board: Board) => void;
  usersPresent: PresencePartial[];
}

export function BoardCard(props: BoardCardProps) {
  const { user, saveBoard, removeBoard } = useUser();

  const toast = useToast();

  const backgroundColorValue = useColorModeValue('#ffffff', `gray.800`);
  const backgroundColor = useHexColor(backgroundColorValue);
  const borderColorValue = useColorModeValue(`${props.board.data.color}.600`, `${props.board.data.color}.200`);
  const borderColor = useHexColor(borderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subTextColor = useHexColor(subTextValue);

  const savedBoards = user?.data.savedBoards || [];
  const isFavorite = user && savedBoards.includes(props.board._id);
  const isYourBoard = user?._id == props.board._createdBy;
  const isRoomOwner = user?._id == props.room._createdBy;

  const grayedOutColorValue = useColorModeValue('gray.100', 'gray.700');
  const grayedOutColor = useHexColor(grayedOutColorValue);

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

  return (
    <>
      <Box
        background={backgroundColor}
        p="2"
        px="2"
        display="grid"
        gridTemplateAreas="'preview preview' 'name options'"
        gridTemplateColumns="1fr auto"
        justifyContent={'space-between'}
        alignItems={'center'}
        onClick={handleEnterBoard}
        borderRadius="md"
        boxSizing="border-box"
        width="400px"
        height="300px"
        transition={'all 0.2s ease-in-out'}
        cursor="pointer"
        border={`solid 2px ${props.selected ? borderColor : 'transparent'}`}
        transform={props.selected ? 'scale(1.02)' : 'scale(1)'}
        _hover={{ border: `solid 2px ${borderColor}`, transform: 'scale(1.02)' }}
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
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
            {props.board.data.name}
          </Box>
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subTextColor}>
            {props.board.data.description}
          </Box>
        </Box>

        <Box display="flex" alignItems={'center'}>
          <Tooltip
            placement="top"
            hasArrow={true}
            isDisabled={!props.board.data.isPrivate}
            label={'This room is password protected'}
            openDelay={400}
          >
            <Box>
              <Icon
                pointerEvents="none"
                verticalAlign={'text-top'}
                fontSize="xl"
                color={props.board.data.isPrivate ? borderColor : grayedOutColor}
                as={props.board.data.isPrivate ? MdLock : MdLockOpen}
                mr="2"
              />
            </Box>
          </Tooltip>

          <Tooltip placement="top" hasArrow={true} isDisabled={!isYourBoard && !isRoomOwner} label={'Edit board settings'} openDelay={400}>
            <IconButton
              size="sm"
              variant={'ghost'}
              color={isYourBoard || isRoomOwner ? borderColor : grayedOutColor}
              aria-label="favorite-board"
              fontSize="xl"
              onClick={handleSettings}
              isDisabled={!isYourBoard && !isRoomOwner}
              onDoubleClick={handleBlockDoubleClick}
              icon={<MdSettings />}
            ></IconButton>
          </Tooltip>

          <Tooltip placement="top" hasArrow={true} label={isFavorite ? 'Unfavorite this board' : 'Favorite this board'} openDelay={400}>
            <IconButton
              size="sm"
              variant={'ghost'}
              color={isFavorite ? borderColor : grayedOutColor}
              aria-label="favorite-board"
              fontSize="xl"
              onClick={handleFavorite}
              onDoubleClick={handleBlockDoubleClick}
              icon={isFavorite ? <MdStar /> : <MdStarOutline />}
            ></IconButton>
          </Tooltip>

          <Tooltip placement="top" hasArrow={true} label={"Copy this board's link"} openDelay={400}>
            <IconButton
              size="sm"
              variant={'ghost'}
              color={borderColor}
              aria-label="copy-link-board"
              fontSize="xl"
              mr="0"
              onClick={(e) => {
                handleCopyLink(e, props.board);
              }}
              onDoubleClick={handleBlockDoubleClick}
              icon={<MdLink />}
            ></IconButton>
          </Tooltip>

          <Tooltip placement="top" hasArrow={true} label={'More Information'} openDelay={400} ml="1">
            <IconButton
              size="sm"
              variant={'ghost'}
              color={borderColor}
              aria-label="enter-board"
              fontSize="xl"
              onClick={handleInformation}
              onDoubleClick={handleBlockDoubleClick}
              icon={<MdInfo />}
            ></IconButton>
          </Tooltip>
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
