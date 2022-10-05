/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, IconButton, Text, Tooltip, useColorModeValue, useDisclosure, useToken } from '@chakra-ui/react';
import { Board, Room } from '@sage3/shared/types';
import { EnterRoomModal } from '../modals/EnterRoomModal';
import { MdLock, MdLockOpen, MdPerson, MdSettings } from 'react-icons/md';
import { useUser } from '../../../hooks';
import { EditRoomModal } from '../modals/EditRoomModal';
import { BoardList } from './BoardList';

export type RoomCardProps = {
  room: Room;
  selected: boolean;
  userCount: number;
  onEnter: () => void;
  onDelete: () => void;
  onEdit: () => void;

  onBackClick: () => void;
  onBoardClick: (board: Board) => void;
  boards: Board[];
};

/**
 * Room card
 *
 * @export
 * @param {RoomCardProps} props
 * @returns
 */
export function RoomCard(props: RoomCardProps) {
  const { user } = useUser();

  // Is it my board?
  const yours = user?._id === props.room.data.ownerId;

  // Edit Modal Disclousure
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();

  // Enter Modal Disclosure
  const { isOpen: isOpenEnter, onOpen: onOpenEnter, onClose: onCloseEnter } = useDisclosure();

  // Colors
  const borderColor = useColorModeValue('gray.300', 'gray.700');
  const boardColor = props.room.data.color + '.400';
  const backgroundColor = useColorModeValue('whiteAlpha.500', 'gray.900');
  const handleOnEdit = (e: any) => {
    e.stopPropagation();
    onOpenEdit();
  };

  return (
    <>
      <EnterRoomModal
        roomId={props.room._id}
        name={props.room.data.name}
        isPrivate={props.room.data.isPrivate}
        privatePin={props.room.data.privatePin}
        isOpen={isOpenEnter}
        onClose={onCloseEnter}
        onEnter={onOpenEnter}
      />
      <EditRoomModal isOpen={isOpenEdit} onClose={onCloseEdit} onOpen={onOpenEdit} room={props.room} />

      <Box
        boxShadow={'md'}
        borderRadius="md"
        borderLeft="solid 8px"
        borderColor={props.selected ? boardColor : borderColor}
        backgroundColor={backgroundColor}
        my="1"
      >
        <Box
          display="flex"
          justifyContent="left"
          width="100%"
          cursor="pointer"
          alignItems="baseline"
          position="relative"
          onClick={props.onEnter}
        >
          <Box display="flex" height="100%" alignContent={'baseline'} justifyContent="space-between" width="100%">
            <Box display="flex" flexDirection={'column'} alignItems="center" ml="4" transform="translateY(-1px)">
              <Text fontSize="2xl" textOverflow={'ellipsis'} width="100%" textAlign={'left'} fontWeight="semibold">
                {props.room.data.name}
              </Text>
              <Text fontSize="lg" textOverflow={'ellipsis'} width="100%" textAlign={'left'} fontWeight="light">
                {props.room.data.description}
              </Text>
            </Box>

            <Box width="200px" display="flex" alignItems="center" justifyContent="right" mr="2">
              <Box display="flex" alignItems={'center'}>
                <Text fontSize="20px">{props.userCount}</Text>
                <MdPerson fontSize="28px" />
              </Box>
              <Tooltip
                label={props.room.data.isPrivate ? 'Room is Locked' : 'Room is Unlocked'}
                openDelay={400}
                placement="top-start"
                hasArrow
              >
                <Box>{props.room.data.isPrivate ? <MdLock fontSize="24px" /> : <MdLockOpen fontSize="24px" />}</Box>
              </Tooltip>
              <Tooltip label={yours ? 'Edit Room' : "Only the room's owner can edit"} openDelay={400} placement="top-start" hasArrow>
                <IconButton
                  onClick={handleOnEdit}
                  color={boardColor}
                  aria-label="Room Edit"
                  fontSize="3xl"
                  variant="unstlyed"
                  disabled={!yours}
                  icon={<MdSettings />}
                />
              </Tooltip>
            </Box>
          </Box>
        </Box>
        {props.selected ? (
          <Box>
            <BoardList
              onBoardClick={props.onBackClick}
              onBackClick={() => props.onBackClick()}
              selectedRoom={props.room}
              boards={props.boards}
            ></BoardList>
          </Box>
        ) : null}
      </Box>
    </>
  );
}
