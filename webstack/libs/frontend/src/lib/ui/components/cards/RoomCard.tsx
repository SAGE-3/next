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
import { MdLock, MdPerson, MdSettings } from 'react-icons/md';
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

function RoomToolTip(props: { room: SBDocument<RoomSchema> }) {
  return (
    <div>
      <p>{props.room.data.name}</p>
      <p>{props.room.data.description}</p>
    </div>
  );
}

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
        borderWidth="2px"
        borderRadius="md"
        border={`solid ${props.selected ? sageColorByName(props.room.data.color) : borderColor} 3px`}
        height="80px"
        width="100%"
        my="2"
        pb="1"
        boxShadow="md"
        cursor="pointer"
        alignItems="baseline"
        style={{
          background: `linear-gradient(transparent 90%, ${
            props.selected ? sageColorByName(props.room.data.color) : borderColor
          } 90% ) no-repeat`,
        }}
        position="relative"
        color={props.selected ? sageColorByName(props.room.data.color) : textColor}
        onClick={props.onEnter}
      >
        <Box display="flex" height="100%" alignContent={'center'} justifyContent="space-between" width="100%">
          <Box display="flex" flexDirection={'column'} alignItems="center" ml="2">
            <Text fontSize="2xl" textOverflow={'ellipsis'} width="100%">
              {props.room.data.name}
            </Text>
            <Text fontSize="md" textOverflow={'ellipsis'} width="100%">
              {props.room.data.description}
            </Text>
          </Box>

          <Box width="200px" display="flex" alignItems="center" justifyContent="right" mr="2">
            <Box display="flex" alignItems={'center'}>
              <Text fontSize="xl">{props.userCount}</Text>
              <MdPerson fontSize="22px" />
            </Box>
            {props.room.data.isPrivate ? (
              <Box>
                <MdLock fontSize="22px" />
              </Box>
            ) : null}
            {yours ? (
              <Tooltip label="Edit Room" openDelay={400} placement="top-start" hasArrow>
                <IconButton
                  onClick={onOpenEdit}
                  color={props.selected ? sageColorByName(props.room.data.color) : borderColor}
                  aria-label="Board Edit"
                  fontSize="3xl"
                  variant="ghost"
                  _hover={{ transform: 'scale(1.3)', opacity: 0.75 }}
                  transition="transform .2s"
                  icon={<MdSettings />}
                />
              </Tooltip>
            ) : null}
          </Box>
        </Box>
      </Box>
    </>
  );
}
