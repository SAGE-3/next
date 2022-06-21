/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, Text, Tooltip, useColorModeValue } from "@chakra-ui/react";
import { CreateRoomModal, RoomCard, useRoomStore } from "@sage3/frontend";
import { SBDocument } from "@sage3/sagebase";
import { RoomSchema } from "@sage3/shared/types";
import { useEffect, useState } from "react";

type RoomListProps = {
  onRoomClick: (room: SBDocument<RoomSchema>) => void;
  selectedRoom: SBDocument<RoomSchema> | null;
}

export function RoomList(props: RoomListProps) {
  const rooms = useRoomStore((state) => state.rooms);
  const deleteRoom = useRoomStore((state) => state.delete);
  const subToAllRooms = useRoomStore((state) => state.subscribeToAllRooms);

  const borderColor = useColorModeValue('#718096', '#A0AEC0');

  useEffect(() => {
    subToAllRooms();
  }, [subToAllRooms]);

  const [newRoomModal, setNewRoomModal] = useState(false);
  return (
    <>
      {rooms
        .sort((a, b) => a.data.name.localeCompare(b.data.name))
        .map((room) => {
          return (
            <RoomCard
              key={room._id}
              room={room}
              selected={props.selectedRoom ? room._id === props.selectedRoom._id : false}
              onEnter={() => props.onRoomClick(room)}
              onEdit={() => console.log('edit room')}
              onDelete={() => deleteRoom(room._id)}
            ></RoomCard>
          );
        })}
      <Tooltip label="Create a room" hasArrow placement="right">
        <Button
          height="60px"
          width="60px"
          m="2"
          borderRadius="lg"
          border={`solid ${borderColor} 2px`}
          fontSize="48px"
          p="0"
          _hover={{ transform: 'scale(1.1)' }}
          onClick={() => setNewRoomModal(true)}
        >
          <Text fontSize="4xl" fontWeight="bold" transform={'translateY(-3px)'}>
            +
          </Text>
        </Button>
      </Tooltip>
      <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>
    </>
  );
}
