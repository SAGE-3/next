/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text, useDisclosure, Icon, Tooltip } from '@chakra-ui/react';
import { MdLock, MdStar, MdExitToApp, MdStarOutline } from 'react-icons/md';

import { EnterBoardModal, useHexColor, useUser } from '@sage3/frontend';
import { Board } from '@sage3/shared/types';

export function BoardRow(props: { board: Board; selected: boolean; onClick: (board: Board) => void; usersPresent: number }) {
  const { user, saveBoard, removeBoard } = useUser();

  const borderColorValue = useColorModeValue(`${props.board.data.color}.600`, `${props.board.data.color}.200`);
  const borderColor = useHexColor(borderColorValue);
  // const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  // const borderColorG = useHexColor(borderColorGray);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const savedBoards = user?.data.savedBoards || [];
  const isFavorite = user && savedBoards.includes(props.board._id);
  const boardColor = props.board.data.color;

  const handleFavorite = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    const boardId = props.board._id;
    if (user && removeBoard && saveBoard) {
      savedBoards.includes(boardId) ? removeBoard(boardId) : saveBoard(boardId);
    }
  };

  // Disclosure
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Enter Board
  const handleEnterBoard = (ev: any) => {
    ev.stopPropagation();
    onOpen();
  };

  return (
    <Box
      background={linearBGColor}
      p={props.selected ? '2' : '1'}
      px="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      onClick={() => props.onClick(props.board)}
      borderRadius="md"
      boxSizing="border-box"
      width="400px"
      height="56px"
      border={`solid  ${props.selected ? `2px ${borderColor}` : '1px gray'}`}
      // borderLeft={props.selected ? `${borderColor} solid 8px` : ''}
      _hover={{ cursor: 'pointer', border: `solid 2px ${borderColor}` }}
      transition={'all 0.1s ease-in-out'}
      onDoubleClick={handleEnterBoard}
    >
      <EnterBoardModal board={props.board} isOpen={isOpen} onClose={onClose} />

      <Box display="flex" flexDir="column" width="260px">
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
          {props.board.data.name}
        </Box>
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs">
          {props.board.data.description}
        </Box>
      </Box>

      <Box display="flex" alignItems={'center'}>
        {props.board.data.isPrivate && (
          <Tooltip placement="top" hasArrow={true} label={'This room is password protected'} openDelay={400} ml="1">
            <Box>
              <Icon verticalAlign={'text-top'} fontSize="xl" color={borderColor} as={MdLock} mr="1" />
            </Box>
          </Tooltip>
        )}

        <Tooltip placement="top" hasArrow={true} label={'Number of users'} openDelay={400} ml="1">
          <Text color={borderColor} fontSize="xl" fontWeight="bold" mx="1">
            {props.usersPresent}
          </Text>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Favorite this board'} openDelay={400} ml="1">
          <IconButton
            size="sm"
            variant={'ghost'}
            colorScheme={boardColor}
            aria-label="enter-board"
            fontSize="xl"
            onClick={handleFavorite}
            icon={isFavorite ? <MdStar /> : <MdStarOutline />}
          ></IconButton>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Enter this board'} openDelay={400} ml="1">
          <IconButton
            size="sm"
            variant={'ghost'}
            colorScheme={boardColor}
            aria-label="enter-board"
            fontSize="xl"
            onClick={handleEnterBoard}
            icon={<MdExitToApp />}
          ></IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
