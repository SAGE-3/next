/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, IconButton, Text, Tooltip, useColorModeValue, useDisclosure } from '@chakra-ui/react';

import { MdLock, MdLockOpen, MdSettings } from 'react-icons/md';

import { Board, Room } from '@sage3/shared/types';
import { useHexColor, useUser } from '../../../hooks';
import { EditRoomModal } from '../modals/EditRoomModal';
import { EnterRoomModal } from '../modals/EnterRoomModal';
import { BoardList } from '../lists/BoardList';

export type RoomCardProps = {
  room: Room;
  selected: boolean;
  userCount: number;
  onEnter: () => void;
  onDelete: () => void;

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
  // Can I list the boards: is it mine or not private?
  const [canList, setCanList] = useState(!props.room.data.isPrivate || yours);

  // Edit Modal Disclousure
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();

  // Enter Modal Disclosure
  const { isOpen: isOpenEnter, onOpen: onOpenEnter, onClose: onCloseEnter } = useDisclosure();

  // Colors
  const boardColor = useHexColor(props.room.data.color);
  // const borderColor = useColorModeValue('gray.300', 'gray.700');
  // const backgroundColor = useColorModeValue('whiteAlpha.500', 'gray.900');
  // const bgColor = useHexColor(backgroundColor);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const handleOnEdit = (e: any) => {
    e.stopPropagation();
    onOpenEdit();
  };

  useEffect(() => {
    // open the modal when...
    if (props.selected && props.room.data.isPrivate && !canList) {
      onOpenEnter();
    }
  }, [props.selected, canList, props.room.data.isPrivate, onOpenEnter]);

  const handleOnEnter = () => {
    // success with password
    setCanList(true);
  }

  return (
    <>
      <EnterRoomModal
        roomId={props.room._id}
        name={props.room.data.name}
        isPrivate={props.room.data.isPrivate}
        privatePin={props.room.data.privatePin}
        isOpen={isOpenEnter}
        onClose={onCloseEnter}
        onEnter={handleOnEnter}
      />
      <EditRoomModal isOpen={isOpenEdit} onClose={onCloseEdit} onOpen={onOpenEdit} room={props.room} boards={props.boards} />

      <Box
        boxShadow={'md'}
        borderRadius="md"
        border={props.selected ? 'solid 2px' : ''}
        borderLeft="solid 8px"
        borderColor={props.selected ? boardColor : boardColor}
        background={linearBGColor}
        onClick={props.onEnter}
        cursor="pointer"
        transition="max-height 2s ease"
        py="1"
        overflow="hidden"
        maxHeight={props.selected ? '1600px' : '200px'} //This is to get the animation to work.
      >
        <Box display="flex" justifyContent="left" width="100%" position="relative" flexDir="column" height="100%">
          <Box display="flex" alignContent={'baseline'} justifyContent="space-between" width="100%">
            <Box display="flex" flexDirection={'column'} alignItems="center" ml="4" transform="translateY(-1px)">
              <Text fontSize="2xl" textOverflow={'ellipsis'} width="100%" textAlign={'left'} fontWeight="semibold">
                {props.room.data.name}
              </Text>
              <Text fontSize="lg" textOverflow={'ellipsis'} width="100%" textAlign={'left'} fontWeight="light">
                {props.room.data.description}
              </Text>
            </Box>

            <Box width="200px" display="flex" alignItems="center" justifyContent="right" mr="2">
              <Tooltip label={props.userCount + ' connected clients'} openDelay={400} placement="top-start" hasArrow>
                <Text fontSize="22px" mr="2" transform="translateY(1px)">
                  {props.userCount}
                </Text>
              </Tooltip>

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
                  aria-label="Room Edit"
                  fontSize="3xl"
                  variant="unstlyed"
                  disabled={!yours}
                  icon={<MdSettings />}
                />
              </Tooltip>
            </Box>
          </Box>
          <Box height="100%">
            {props.selected && canList ? (
              <BoardList
                onBoardClick={props.onBackClick}
                onBackClick={() => props.onBackClick()}
                selectedRoom={props.room}
                boards={props.boards}
              ></BoardList>
            ) : null}
          </Box>
        </Box>
      </Box>
    </>
  );
}
