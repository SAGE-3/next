/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import { Box, ButtonGroup, IconButton, InputGroup, InputLeftElement, Input, Icon, useColorModeValue } from '@chakra-ui/react';

import { IconType } from 'react-icons';
import { MdList, MdGridView, MdSearch } from 'react-icons/md';

import { useHexColor } from '@sage3/frontend';
import { Room, Board, Presence } from '@sage3/shared/types';

import { BoardCard } from '../BoardCard';
import { BoardRow } from '../BoardRow';

interface QuickAccessProps {
  title: string;
  icon: IconType;
  rooms: Room[];
  boardListView: 'list' | 'grid';
  setBoardListView: (view: 'list' | 'grid') => void;
  boardSearch: string;
  setBoardSearch: (search: string) => void;
  filteredBoards: Board[];
  handleBoardClick: (board: Board) => void;
  selectedBoard: Board | undefined;
  presences: Presence[];
  scrollToBoardRef: React.RefObject<HTMLDivElement>;
}

const QuickAccessPage = ({
  title,
  icon,
  rooms,
  boardListView,
  setBoardListView,
  boardSearch,
  setBoardSearch,
  filteredBoards,
  handleBoardClick,
  selectedBoard,
  presences,
  scrollToBoardRef,
}: QuickAccessProps) => {
  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);

  return (
    <Box height="full" display="flex" flexDir="column" gap="8">
      <Box display="flex" flexDir="column">
        <Box fontSize="xx-large" fontWeight="bold" display="flex" alignItems="center" gap="2">
          <Icon as={icon} /> {title}
        </Box>
        <Box display="flex" alignItems="center" mt="2" gap="2">
          <ButtonGroup size="md" isAttached variant="outline">
            <IconButton
              aria-label="Board List View"
              colorScheme={boardListView === 'list' ? 'teal' : 'gray'}
              onClick={() => setBoardListView('list')}
              icon={<MdList />}
            />
            <IconButton
              aria-label="Board Grid View"
              colorScheme={boardListView === 'grid' ? 'teal' : 'gray'}
              onClick={() => setBoardListView('grid')}
              icon={<MdGridView />}
            />
          </ButtonGroup>

          <InputGroup size="md" width="415px" my="1">
            <InputLeftElement pointerEvents="none">
              <MdSearch />
            </InputLeftElement>
            <Input
              placeholder="Search Boards"
              value={boardSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBoardSearch(e.target.value)}
            />
          </InputGroup>
        </Box>
      </Box>

      <Box
        h="100%"
        mb="2"
        overflowY="auto"
        overflowX="hidden"
        css={{
          '&::-webkit-scrollbar': {
            background: 'transparent',
            width: '5px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: scrollBarColor,
            borderRadius: '48px',
          },
        }}
      >
        <Box display="flex" flexDir={boardListView === 'list' ? 'column' : 'row'} flexWrap="wrap" p="2" gap="2">
          {filteredBoards &&
            filteredBoards.map((board) => (
              <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined} h="fit-content">
                {boardListView === 'grid' ? (
                  <BoardCard
                    room={rooms.find((room) => board.data.roomId === room._id) as Room}
                    board={board}
                    onClick={() => handleBoardClick(board)}
                    selected={selectedBoard ? selectedBoard._id === board._id : false}
                    usersPresent={presences.filter((p) => p.data.boardId === board._id)}
                  />
                ) : (
                  <BoardRow
                    room={rooms.find((room) => board.data.roomId === room._id) as Room}
                    key={board._id}
                    board={board}
                    onClick={() => handleBoardClick(board)}
                    selected={selectedBoard ? selectedBoard._id === board._id : false}
                    usersPresent={presences.filter((p) => p.data.boardId === board._id).length}
                  />
                )}
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
};

export default QuickAccessPage;
