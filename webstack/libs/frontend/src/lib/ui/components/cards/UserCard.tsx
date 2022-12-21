/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { User } from '@sage3/shared/types';
import { useUser } from '../../../hooks';

export type UserCardProps = {
  user: User;
  selected: boolean;
  onClick: () => void;
};

function UserCardTooltip(props: { user: User }) {
  return (
    <div>
      <p>{props.user.data.name}</p>
    </div>
  );
}

/**
 * User card
 *
 * @export
 * @param {RoomCardProps} props
 * @returns
 */
export function UserCard(props: UserCardProps) {
  const { user } = useUser();

  const borderColor = useColorModeValue('#718096', '#A0AEC0');
  const textColor = useColorModeValue('#2D3748', '#E2E8F0');

  return (
    <>
      <Box
        display="flex"
        justifyContent="left"
        borderWidth="2px"
        borderRadius="md"
        border={`solid  3px`}
        borderColor={props.selected ? props.user.data.color : borderColor}
        height="80px"
        width="100%"
        my="2"
        pb="1"
        boxShadow="md"
        cursor="pointer"
        alignItems="baseline"
        style={{
          background: `linear-gradient(transparent 90%, ${props.selected ? props.user.data.color : borderColor} 90% ) no-repeat`,
        }}
        position="relative"
        color={props.selected ? props.user.data.color : textColor}
        onClick={props.onClick}
      >
        <Box display="flex" height="100%" alignContent={'center'} justifyContent="space-between" width="100%">
          <Box display="flex" flexDirection={'column'} alignItems="center" ml="2">
            <Text fontSize="2xl" textOverflow={'ellipsis'} width="100%">
              {props.user.data.name}
            </Text>
          </Box>

          <Box width="200px" display="flex" alignItems="center" justifyContent="right" mr="2"></Box>
        </Box>
      </Box>
    </>
  );
}
