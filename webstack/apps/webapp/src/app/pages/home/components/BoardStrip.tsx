/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License. The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Board, PresencePartial, Room } from '@sage3/shared/types';
import { BoardCard } from './BoardCard';
import { AppInfo } from './BoardPreview';

const NO_USERS: PresencePartial[] = [];
const NO_APPS: AppInfo[] = [];

export function BoardStrip(props: {
  boards: Board[];
  rooms: Room[];
  selectedBoard?: Board;
  presenceByBoard: Map<string, PresencePartial[]>;
  boardPreviews: Map<string, AppInfo[]>;
  scrollBarColor: string;
  onBoardClick: (board: Board) => void;
}) {
  const list = useRef<VirtuosoHandle>(null);
  const rooms = useMemo(() => new Map(props.rooms.map((room) => [room._id, room])), [props.rooms]);
  const boards = useMemo(() => props.boards.filter((board) => rooms.has(board.data.roomId)), [props.boards, rooms]);
  const selectedIndex = boards.findIndex((board) => board._id === props.selectedBoard?._id);
  useEffect(() => {
    if (selectedIndex >= 0) list.current?.scrollIntoView({ index: selectedIndex });
  }, [selectedIndex]);
  return (
    <Box
      width="100%"
      height="100%"
      minWidth="0"
      css={{
        // Virtuoso's inline-block items otherwise align to each preview's text baseline.
        '& [data-testid="virtuoso-item-list"], & [data-item-index]': { verticalAlign: 'top' },
        '& [data-virtuoso-scroller]::-webkit-scrollbar': { background: 'transparent', height: '10px' },
        '& [data-virtuoso-scroller]::-webkit-scrollbar-thumb': { background: props.scrollBarColor, borderRadius: '48px' },
      }}
    >
      <Virtuoso
        ref={list}
        horizontalDirection
        data={boards}
        style={{ width: '100%', height: '100%', overflowY: 'hidden' }}
        increaseViewportBy={262}
        initialTopMostItemIndex={Math.max(0, selectedIndex)}
        computeItemKey={(_index, board) => board._id}
        itemContent={(_index, board) => (
          <Box width="262px" height="100%" pl="2" display="flex" alignItems="center" boxSizing="border-box" whiteSpace="normal">
            <BoardCard
              board={board}
              room={rooms.get(board.data.roomId)!}
              onClick={props.onBoardClick}
              selected={board._id === props.selectedBoard?._id}
              usersPresent={props.presenceByBoard.get(board._id) ?? NO_USERS}
              appInfo={props.boardPreviews.get(board._id) ?? NO_APPS}
            />
          </Box>
        )}
      />
    </Box>
  );
}
