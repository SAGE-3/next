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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, IconButton, Input, InputGroup, InputLeftElement, Tooltip, useColorModeValue } from '@chakra-ui/react';

import { Virtuoso, VirtuosoGrid, VirtuosoGridHandle, VirtuosoHandle } from 'react-virtuoso';

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
  onCreateBoard: () => void;
  onRefreshPreviews: () => void;
  onBoardClick: (board: Board) => void;
};

const NO_USERS: PresencePartial[] = [];
const NO_APPS: AppInfo[] = [];

export function BoardListPanel(props: BoardListPanelProps) {
  const { setBoardListView, settings } = useUserSettings();
  const boardListView = settings.selectedBoardListView ?? 'grid';
  const grid = useRef<VirtuosoGridHandle>(null);
  const list = useRef<VirtuosoHandle>(null);

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
    [props.boards, props.selectedRoom?._id, boardSearch],
  );

  const selectedIndex = filteredBoards.findIndex((board) => board._id === props.selectedBoard?._id);
  useEffect(() => {
    if (selectedIndex < 0) return;
    if (boardListView === 'grid') grid.current?.scrollToIndex({ index: selectedIndex, align: 'center' });
    else list.current?.scrollIntoView({ index: selectedIndex });
  }, [selectedIndex, boardListView]);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
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

      <Box
        minWidth="420px"
        maxWidth="2200px"
        css={{
          '& [data-virtuoso-scroller]': scrollbarCss,
          '& .sage-board-grid': { display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '4px 8px' },
          '& .sage-board-grid-item': { width: '250px', height: '190px', flex: 'none' },
        }}
      >
        {boardListView === 'grid' ? (
          <VirtuosoGrid
            ref={grid}
            data={filteredBoards}
            style={{ height: 'calc(100svh - 270px)', width: '100%' }}
            listClassName="sage-board-grid"
            itemClassName="sage-board-grid-item"
            increaseViewportBy={206}
            initialTopMostItemIndex={Math.max(0, selectedIndex)}
            computeItemKey={(_index, board) => board._id}
            itemContent={(_index, board) => (
              <BoardCard
                board={board}
                room={props.selectedRoom!}
                onClick={props.onBoardClick}
                selected={props.selectedBoard?._id === board._id}
                usersPresent={props.presenceByBoard.get(board._id) ?? NO_USERS}
                appInfo={props.boardPreviews.get(board._id) ?? NO_APPS}
              />
            )}
          />
        ) : (
          <Virtuoso
            ref={list}
            data={filteredBoards}
            style={{ height: 'calc(100svh - 270px)', width: '100%' }}
            fixedItemHeight={68}
            increaseViewportBy={136}
            initialTopMostItemIndex={Math.max(0, selectedIndex)}
            computeItemKey={(_index, board) => board._id}
            itemContent={(_index, board) => (
              <Box pl="2" pb="3" height="68px" boxSizing="border-box">
                <BoardRow
                  board={board}
                  room={props.selectedRoom!}
                  onClick={props.onBoardClick}
                  selected={props.selectedBoard?._id === board._id}
                  usersPresent={(props.presenceByBoard.get(board._id) ?? NO_USERS).length}
                />
              </Box>
            )}
          />
        )}
      </Box>
    </Flex>
  );
}
