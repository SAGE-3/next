/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Chakra Iports
import { Box, useColorModeValue, Text, Tooltip } from '@chakra-ui/react';

// Icons
import { MdPerson, MdLock } from 'react-icons/md';

// SAGE Imports
import { Board } from '@sage3/shared/types';
import { usePresenceStore, useRoomStore, useHexColor } from '@sage3/frontend';

export function BoardSidebarRow(props: { board: Board; isSelected: boolean; onClick: () => void; onDoubleClick: () => void }) {
  // Room Store
  const { rooms } = useRoomStore((state) => state);

  // Presence Store
  const { presences } = usePresenceStore((state) => state);

  // Colors
  const hightlightGrayValue = useColorModeValue('gray.200', '#444444');
  const hightlightGrayColor = useHexColor(hightlightGrayValue);
  const inactiveGrayValue = useColorModeValue('gray.300', 'gray.700');
  const inactiveGrayColor = useHexColor(inactiveGrayValue);

  // User Count
  const userCount = presences.filter((p) => p.data.boardId === props.board._id).length;
  const roomName = rooms.find((r) => r._id === props.board.data.roomId)?.data.name;
  const userCountColor = userCount > 0 ? undefined : inactiveGrayColor;

  return (
    <Tooltip
      key={'tooltip_recent' + props.board._id}
      openDelay={400}
      hasArrow
      placement="top"
      label={`Board in '${roomName}' - ${userCount ? userCount : 'No'} ${userCount > 1 ? 'users' : 'user'}`}
    >
      <Box
        key={props.board._id}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        transition="all 0.5s"
        pl="48px"
        height="28px"
        backgroundColor={props.isSelected ? hightlightGrayColor : ''}
        onClick={() => props.onClick()}
        onDoubleClick={() => props.onDoubleClick()}
        _hover={{ backgroundColor: hightlightGrayColor, cursor: 'pointer' }}
      >
        <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" mr="5">
          <Text fontSize="md" pl="2" overflow="hidden" textOverflow="ellipsis">
            {props.board.data.name}
          </Text>
        </Box>
        <Box pr="5" display="flex" alignItems="center">
          {props.board.data.isPrivate ? <MdLock color={userCountColor}></MdLock> : undefined}
          <Text fontSize="sm" pl="2" color={userCountColor}>
            {userCount}
          </Text>
          <MdPerson color={userCountColor}></MdPerson>
        </Box>
      </Box>
    </Tooltip>
  );
}
