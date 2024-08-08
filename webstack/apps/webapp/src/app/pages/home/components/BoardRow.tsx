/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text, useDisclosure, Icon, Tooltip, useToast, border } from '@chakra-ui/react';
import { MdLock, MdStar, MdExitToApp, MdStarOutline, MdSettings, MdLink, MdInfo, MdLockOpen } from 'react-icons/md';

import { EnterBoardModal, useHexColor, useUser, copyBoardUrlToClipboard, EditBoardModal, BoardInformationModal } from '@sage3/frontend';
import { Board } from '@sage3/shared/types';

export function BoardRow(props: { board: Board; selected: boolean; onClick: (board: Board) => void; usersPresent: number }) {
  const { user, saveBoard, removeBoard } = useUser();

  // Toast to inform user that they are not a member of a room
  const toast = useToast();

  // const backgroundColorValue = useColorModeValue(`${props.board.data.color}.200`, `${props.board.data.color}.800`);
  const backgroundColorValue = useColorModeValue('#ffffff', `gray.800`);
  const backgroundColor = useHexColor(backgroundColorValue);
  const borderColorValue = useColorModeValue(`${props.board.data.color}.600`, `${props.board.data.color}.200`);
  const borderColor = useHexColor(borderColorValue);
  const boardColor = props.board.data.color;
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);

  const grayedOutColorValue = useColorModeValue('gray.100', 'gray.700');
  const grayedOutColor = useHexColor(grayedOutColorValue);

  const savedBoards = user?.data.savedBoards || [];
  const isFavorite = user && savedBoards.includes(props.board._id);
  const isYourBoard = user?._id == props.board._createdBy;

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
        p={props.selected ? '2' : '1'}
        px="2"
        display="flex"
        justifyContent={'space-between'}
        alignItems={'center'}
        borderRadius="md"
        boxSizing="border-box"
        width="500px"
        height="56px"
        border={`solid 2px ${props.selected ? borderColor : 'transparent'}`}
        transform={props.selected ? 'scale(1.02)' : 'scale(1)'}
        _hover={{ border: `solid 2px ${borderColor}`, transform: 'scale(1.02)' }}
        transition={'all 0.2s ease-in-out'}
        onClick={handleEnterBoard}
        cursor="pointer"
      >
        <EnterBoardModal board={props.board} isOpen={isOpen} onClose={onClose} />

        <Box display="flex" flexDir="column" maxWidth="260px">
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
            {props.board.data.name}
          </Box>
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subText}>
            {props.board.data.description}
          </Box>
        </Box>

        <Box display="flex" alignItems={'center'}>
          <Tooltip placement="top" hasArrow={true} label={'Number of users'} openDelay={400}>
            <Text color={props.usersPresent == 0 ? grayedOutColor : borderColor} fontSize="xl" fontWeight="bold" mr="4">
              {props.usersPresent}
            </Text>
          </Tooltip>

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

          <Tooltip placement="top" hasArrow={true} isDisabled={!isYourBoard} label={'Edit board settings'} openDelay={400}>
            <IconButton
              size="sm"
              variant={'ghost'}
              color={isYourBoard ? borderColor : grayedOutColor}
              aria-label="favorite-board"
              fontSize="xl"
              onClick={handleSettings}
              isDisabled={!isYourBoard}
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
