/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Text, Tooltip, useColorModeValue } from "@chakra-ui/react";
import { RoomSchema } from "@sage3/shared/types";
import { sageColorByName } from "@sage3/shared";
import { SBDocument } from "@sage3/sagebase";

export type RoomCardProps = {
  room: SBDocument<RoomSchema>;
  selected: boolean;
  userCount: number;
  onEnter: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function RoomToolTip(props: { room: SBDocument<RoomSchema> }) {
  return (
    <div>
      <p>{props.room.data.name}</p>
      <p>{props.room.data.description}</p>
    </div>
  )
}

/**
 * Room card
 *
 * @export
 * @param {RoomCardProps} props
 * @returns
 */
export function RoomCard(props: RoomCardProps) {

  const borderColor = useColorModeValue("#A0AEC0", "#4A5568");
  const textColor = useColorModeValue("#2D3748", "#E2E8F0");

  return (
    <Tooltip label={<RoomToolTip room={props.room} />} hasArrow placement="right">
      <Box
        display="flex"
        justifyContent="center"
        borderWidth='2px'
        borderRadius='md'
        border={`solid ${(props.selected) ? sageColorByName(props.room.data.color) : borderColor} 2px`}
        fontWeight="bold"
        width="60px"
        height="60px"
        m="2"
        cursor="pointer"
        alignItems='baseline'
        position="relative"
        color={(props.selected) ? sageColorByName(props.room.data.color) : textColor}
        transition="transform .2s"
        _hover={{ transform: "scale(1.2)" }}
        onClick={props.onEnter}>
        <Text fontSize='4xl'>{props.room.data.name.charAt(0).toLocaleUpperCase()}</Text>
        <Box
          position='absolute'
          right="-10px"
          bottom="-10px"
          backgroundColor={sageColorByName(props.room.data.color)}
          color="white"
          borderRadius='100%'
          width="24px"
          height="24px"
          lineHeight={'20px'}
          display="flex"
          justifyContent="center"
          alignItems='center'
          fontSize='14px'
        >
          {props.userCount}
        </Box>
      </Box>
    </Tooltip >
  );
}