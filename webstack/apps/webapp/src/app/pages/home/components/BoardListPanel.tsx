/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * BoardListPanel — owns board search and list-view toggle state.
 * Keeping these states here means typing in the search box only re-renders
 * this subtree, not the entire Home page.
 *
 * Mount with key={selectedRoom?._id} so that search resets automatically
 * whenever the user switches rooms (React unmounts/remounts on key change).
 */

import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Tooltip,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

import { MdAdd, MdGridView, MdList, MdRefresh, MdSearch } from 'react-icons/md';

import { Board, PresencePartial, Room } from '@sage3/shared/types';
import { fuzzySearch } from '@sage3/shared';
import { useHexColor, useUserSettings } from '@sage3/frontend';

import { BoardCard } from './BoardCard';
import { BoardRow } from './BoardRow';
import { AppInfo } from './BoardPreview';

type BoardListPanelProps = {
  boards: Board[];
  selectedRoom: Room | undefined;
  selectedBoard: Board | undefined;
  presenceByBoard: Map<string, PresencePartial[]>;
  boardPreviews: Map<string, AppInfo[]>;
  previewsLoading: boolean;
  canCreateBoards: boolean;
  scrollToBoardRef: React.RefObject<HTMLDivElement>;
  onCreateBoard: () => void;
  onRefreshPreviews: () => void;
  onBoardClick: (board: Board) => void;
};

export function BoardListPanel(props: BoardListPanelProps) {
  const { setBoardListView, settings } = useUserSettings();
  const boardListView = settings.selectedBoardListView ?? 'grid';

  // Debounced search — uncontrolled input so typing never re-renders this component
  const [boardSearch, setBoardSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Color tokens
  const scrollBarValue = useColorModeValue('gray.300', 'gray.600');
  const scrollBarColor = useHexColor(scrollBarValue);
  const searchBarColorValue = useColorModeValue('gray.100', '#2c2c2c');
  const searchBarColor = useHexColor(searchBarColorValue);
  const searchPlaceholderColorValue = useColorModeValue('gray.400', 'gray.100');
  const searchPlaceholderColor = useHexColor(searchPlaceholderColorValue);

  const filteredBoards = useMemo(
    () =>
      props.boards
        .filter((b) => b.data.roomId === props.selectedRoom?._id)
        .filter((b) => fuzzySearch(b.data.name + ' ' + b.data.description, boardSearch))
        .sort((a, b) => a.data.name.localeCompare(b.data.name)),
    [props.boards, props.selectedRoom?._id, boardSearch]
  );

  const scrollbarCss = {
    '&::-webkit-scrollbar': { background: 'transparent', width: '10px' },
    '&::-webkit-scrollbar-thumb': { background: scrollBarColor, borderRadius: '48px' },
  };

  return (
    <Flex gap="2" flexDirection="column">
      {/* Toolbar: create, search, view toggle, refresh */}
      <Flex align="center" gap="2" justify="flex-start" ml="2">
        <Tooltip label="Create New Board" placement="top" hasArrow>
          <IconButton
            size="sm"
            bg="none"
            aria-label="Create board"
            fontSize="xl"
            onFocus={(e) => e.preventDefault()}
            onClick={props.onCreateBoard}
            isDisabled={!props.canCreateBoards}
            _hover={{ transform: 'scale(1.1)', bg: 'none' }}
            icon={<MdAdd fontSize="24px" />}
          />
        </Tooltip>

        <InputGroup size="md" width="425px" my="1">
          <InputLeftElement pointerEvents="none">
            <MdSearch />
          </InputLeftElement>
          <Input
            placeholder="Search Boards"
            _placeholder={{ opacity: 0.7, color: searchPlaceholderColor }}
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setBoardSearch(value), 150);
            }}
            roundedTop="2xl"
            _focusVisible={{ bg: searchBarColor, outline: 'none', transition: 'none' }}
            bg="inherit"
            roundedBottom="2xl"
          />
        </InputGroup>

        <Tooltip label={boardListView === 'grid' ? 'Switch to List View' : 'Switch to Grid View'} placement="top" hasArrow>
          <IconButton
            size="sm"
            bg="none"
            aria-label={boardListView === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
            onClick={() => setBoardListView(boardListView === 'grid' ? 'list' : 'grid')}
            icon={boardListView === 'grid' ? <MdList fontSize="24px" /> : <MdGridView fontSize="24px" />}
            _hover={{ transform: 'scale(1.1)', bg: 'none' }}
          />
        </Tooltip>

        <Tooltip label="Refresh Board Previews" placement="top" hasArrow>
          <IconButton
            size="sm"
            bg="none"
            aria-label="Refresh board previews"
            isLoading={props.previewsLoading}
            onClick={props.onRefreshPreviews}
            icon={<MdRefresh fontSize="24px" />}
            _hover={{ transform: 'scale(1.1)', bg: 'none' }}
          />
        </Tooltip>
      </Flex>

      {/* Grid view */}
      {boardListView === 'grid' && (
        <Flex
          gap="4"
          pl="2"
          py="1"
          flexWrap="wrap"
          justifyContent="left"
          style={{ maxHeight: 'calc(100svh - 270px)', width: '100%', maxWidth: '2200px' }}
          margin="0"
          overflowY="scroll"
          overflowX="hidden"
          minWidth="420px"
          css={scrollbarCss}
        >
          {filteredBoards.map((board) => (
            <Box key={board._id} ref={board._id === props.selectedBoard?._id ? props.scrollToBoardRef : undefined}>
              <BoardCard
                board={board}
                room={props.selectedRoom!}
                onClick={() => props.onBoardClick(board)}
                selected={props.selectedBoard?._id === board._id}
                usersPresent={props.presenceByBoard.get(board._id) ?? []}
                appInfo={props.boardPreviews.get(board._id) ?? []}
              />
            </Box>
          ))}
        </Flex>
      )}

      {/* List view */}
      {boardListView === 'list' && (
        <VStack
          gap="3"
          alignItems="left"
          pl="2"
          style={{ height: 'calc(100svh - 270px)' }}
          overflowY="scroll"
          overflowX="hidden"
          minWidth="420px"
          css={{
            '&::-webkit-scrollbar': { background: 'transparent', width: '5px' },
            '&::-webkit-scrollbar-thumb': { background: scrollBarColor, borderRadius: '48px' },
          }}
        >
          {filteredBoards.map((board) => (
            <Box key={board._id} ref={board._id === props.selectedBoard?._id ? props.scrollToBoardRef : undefined}>
              <BoardRow
                key={board._id}
                board={board}
                room={props.selectedRoom!}
                onClick={() => props.onBoardClick(board)}
                selected={props.selectedBoard?._id === board._id}
                usersPresent={(props.presenceByBoard.get(board._id) ?? []).length}
              />
            </Box>
          ))}
        </VStack>
      )}
    </Flex>
  );
}
