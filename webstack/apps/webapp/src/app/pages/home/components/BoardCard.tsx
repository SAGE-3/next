/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  useColorModeValue,
  IconButton,
  Box,
  useDisclosure,
  Tooltip,
  useToast,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Portal,
  useOutsideClick,
  Divider,
} from '@chakra-ui/react';
import { MdStar, MdLink, MdStarOutline, MdSettings, MdInfo, MdLock, MdLockOpen } from 'react-icons/md';

import { EnterBoardModal, useHexColor, useUser, copyBoardUrlToClipboard, EditBoardModal, BoardInformationModal } from '@sage3/frontend';
import { Board, PresencePartial, Room } from '@sage3/shared/types';
import { BoardPreview } from './BoardPreview';
import { UserPresenceIcons } from './UserPresenceIcons';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { useRef } from 'react';

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
  const baseBorderColorValue = useColorModeValue('gray.100', 'gray.700');
  const baseBorderColor = useHexColor(baseBorderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subTextColor = useHexColor(subTextValue);
  const popoverBgColorValue = useColorModeValue('#ffffff', `gray.800`);
  const popoverBgColor = useHexColor(popoverBgColorValue);
  const highlightGrayValue = useColorModeValue('gray.200', '#444444');
  const highlightGray = useHexColor(highlightGrayValue);

  const savedBoards = user?.data.savedBoards || [];
  const isFavorite = user && savedBoards.includes(props.board._id);
  const isYourBoard = user?._id == props.board._createdBy;
  const isRoomOwner = user?._id == props.room._createdBy;

  const starColorValue = useColorModeValue('yellow.600', 'yellow.200');
  const starColor = useHexColor(starColorValue);
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

  // Popover
  const { isOpen: optionsPopoverIsOpen, onOpen: optionsPopoverOnOpen, onClose: optionPopoverOnClose } = useDisclosure();
  const popoverRef = useRef(null);

  // Solution to make popover close when clicking outside
  // https://github.com/chakra-ui/chakra-ui/issues/7359#issuecomment-1698485043
  useOutsideClick({
    ref: popoverRef,
    handler: optionPopoverOnClose,
  });

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
      <Box>
        <Box
          background={backgroundColor}
          p="2"
          px="2"
          display="grid"
          gridTemplateAreas="'preview preview' 'name options'"
          gridTemplateColumns="1fr auto"
          justifyContent={'space-between'}
          alignItems={'center'}
          // onClick={handleEnterBoard}
          borderRadius="xl"
          boxSizing="border-box"
          height="190px"
          width="250px"
          transition={'all 0.2s ease-in-out'}
          cursor="pointer"
          border={`solid 1px ${props.selected ? borderColor : baseBorderColor}`}
          transform={props.selected ? 'scale(1.02)' : 'scale(1)'}
          _hover={{ border: `solid 2px ${borderColor}`, transform: 'scale(1.02)' }}
        >
          <Box gridArea="preview" position="relative" onClick={handleEnterBoard} overflow="hidden">
            <Box display="flex">
              <Box position="absolute" height={0} width="100%" bottom="6">
                <UserPresenceIcons
                  usersPresent={props.usersPresent}
                  maxUsersDisplayed={5}
                  anonymousNames={props.board.data.isPrivate}
                  overflow="hidden"
                  width={150}
                  height={20}
                />
              </Box>
            </Box>
            <BoardPreview board={props.board} width={230} height={120} isSelected={props.selected} />
            <Tooltip hasArrow={true} label={isFavorite ? 'Unfavorite this board' : 'Favorite this board'} openDelay={400}>
              <IconButton
                top="1"
                right="1"
                position="absolute"
                size="sm"
                variant={'ghost'}
                color={isFavorite ? starColor : grayedOutColor}
                aria-label="favorite-board"
                fontSize="xl"
                onClick={handleFavorite}
                onDoubleClick={handleBlockDoubleClick}
                icon={isFavorite ? <MdStar /> : <MdStarOutline />}
                _hover={{ transform: 'scale(1.3)', bg: 'none' }}
                p="0"
                h="fit-content"
              ></IconButton>
            </Tooltip>
          </Box>

          <EnterBoardModal board={props.board} isOpen={isOpen} onClose={onClose} />

          <Box display="flex" flexDir="column" pl="1" width="150px">
            <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
              {props.board.data.name}
            </Box>
            <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subTextColor}>
              {props.board.data.description}
            </Box>
          </Box>
          <Box ref={popoverRef}>
            <Popover
              closeOnBlur={true} // Ensures the popover closes when you click outside
              closeOnEsc={true} // Ensures the popover closes when you press the Esc key
              isOpen={optionsPopoverIsOpen}
              onOpen={optionsPopoverOnOpen}
              onClose={optionPopoverOnClose}
            >
              <PopoverTrigger>
                <IconButton
                  // hidden={!isYourBoard}
                  aria-label="Board options"
                  size="sm"
                  variant={'ghost'}
                  // color={isYourBoard ? borderColor : grayedOutColor}
                  fontSize="xl"
                  onDoubleClick={handleBlockDoubleClick}
                  icon={<BsThreeDotsVertical />}
                />
              </PopoverTrigger>
              <Portal>
                <PopoverContent w="175px" rootProps={{ style: { right: 0 } }} bg={popoverBgColor} p="1" rounded="md">
                  <Box
                    _hover={{ background: highlightGray }}
                    cursor="pointer"
                    px="2"
                    py="1"
                    onClick={(e) => {
                      handleCopyLink(e, props.board);
                    }}
                    onDoubleClick={handleBlockDoubleClick}
                    fontSize="sm"
                    rounded="md"
                  >
                    Copy Link
                  </Box>
                  <Box
                    _hover={{ background: highlightGray }}
                    hidden={!isYourBoard && !isRoomOwner}
                    cursor="pointer"
                    px="2"
                    py="1"
                    onClick={handleSettings}
                    onDoubleClick={handleBlockDoubleClick}
                    fontSize="sm"
                    rounded="md"
                  >
                    Edit Board
                  </Box>
                  <Box
                    _hover={{ background: highlightGray }}
                    cursor="pointer"
                    px="2"
                    py="1"
                    onClick={handleInformation}
                    onDoubleClick={handleBlockDoubleClick}
                    fontSize="sm"
                    rounded="md"
                  >
                    Info
                  </Box>
                </PopoverContent>
              </Portal>
            </Popover>
          </Box>

          {/* <Box display="flex" alignItems={'center'}>
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
        </Box> */}
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
      </Box>
    </>
  );
}
