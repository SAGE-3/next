/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, IconButton, Text, Tooltip, useColorModeValue, useDisclosure } from '@chakra-ui/react';
import { RoomSchema } from '@sage3/shared/types';
import { sageColorByName } from '@sage3/shared';
import { SBDocument } from '@sage3/sagebase';
import { EnterRoomModal } from '../modals/EnterRoomModal';
import { MdLock, MdLockOpen, MdPerson, MdSettings } from 'react-icons/md';
import { useUser } from '../../../hooks';
import { EditRoomModal } from '../modals/EditRoomModal';

export type RoomCardProps = {
  room: SBDocument<RoomSchema>;
  selected: boolean;
  userCount: number;
  onEnter: () => void;
  onDelete: () => void;
  onEdit: () => void;
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

  const borderColor = useColorModeValue('#718096', '#A0AEC0');
  const textColor = useColorModeValue('#2D3748', '#E2E8F0');

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
        display="flex"
        justifyContent="left"
        borderWidth="1px"
        borderRadius="md"
        borderLeft={`solid ${props.selected ? sageColorByName(props.room.data.color) : borderColor} 8px`}
        height="50x"
        my="1"
        width="100%"
        cursor="pointer"
        alignItems="baseline"
        position="relative"
        onClick={props.onEnter}
      >
        <Box display="flex" height="100%" alignContent={'baseline'} justifyContent="space-between" width="100%">
          <Box display="flex" flexDirection={'column'} alignItems="center" ml="2" transform="translateY(-1px)">
            <Text fontSize="xl" textOverflow={'ellipsis'} width="100%">
              {props.room.data.name}
            </Text>
            <Text fontSize="sm" textOverflow={'ellipsis'} width="100%">
              {props.room.data.description}
            </Text>
          </Box>

          <Box width="200px" display="flex" alignItems="center" justifyContent="right" mr="2">
            <Box display="flex" alignItems={'center'}>
              <Text fontSize="sm">{props.userCount}</Text>
              <MdPerson fontSize="22px" />
            </Box>
            <Tooltip
              label={props.room.data.isPrivate ? 'Room is Locked' : 'Room is Unlocked'}
              openDelay={400}
              placement="top-start"
              hasArrow
            >
              <Box>{props.room.data.isPrivate ? <MdLock fontSize="20px" /> : <MdLockOpen fontSize="20px" />}</Box>
            </Tooltip>
            <Tooltip label={yours ? 'Edit Room' : "Only the room's owner can edit"} openDelay={400} placement="top-start" hasArrow>
              <IconButton
                onClick={handleOnEdit}
                color={props.selected ? sageColorByName(props.room.data.color) : borderColor}
                aria-label="Room Edit"
                fontSize="2xl"
                variant="unstlyed"
                disabled={!yours}
                icon={<MdSettings />}
              />
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </>
  );
}
