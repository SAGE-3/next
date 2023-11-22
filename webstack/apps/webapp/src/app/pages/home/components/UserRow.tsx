/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';
import { Presence } from '@sage3/shared/types';
import { MdPerson } from 'react-icons/md';
import { UserPresence } from '../..';

export function UserRow(props: { userPresence: UserPresence; selected: boolean; onClick: (user: Presence) => void }) {
  const borderColorValue = useColorModeValue(props.userPresence.user.data.color, props.userPresence.user.data.color);
  const borderColor = useHexColor(borderColorValue);

  const online = useHexColor('teal');
  const offline = useHexColor('gray.700');
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const handleUserClick = () => {
    const user = props.userPresence;
    if (user.presence) {
      props.onClick(user.presence);
    }
  };

  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      onClick={handleUserClick}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${props.selected ? borderColor : 'transpanent'}`}
      borderLeft={props.selected ? `${borderColor} solid 8px` : ''}
      _hover={{ cursor: 'pointer', border: `solid 1px ${borderColor}`, borderLeft: props.selected ? `${borderColor} solid 8px` : '' }}
      transition={'all 0.2s ease-in-out'}
    >
      <Box display="flex" alignItems={'center'}>
        <IconButton
          size="md"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="4xl"
          color={props.userPresence.presence?.data.status === 'online' ? online : offline}
          icon={<MdPerson />}
        ></IconButton>
        <Box display="flex" flexDir="column">
          <Text
            fontSize="sm"
            fontWeight="bold"
            textAlign="left"
            overflow={'hidden'}
            whiteSpace={'nowrap'}
            textOverflow={'ellipsis'}
            width="160px"
          >
            {props.userPresence.user.data.name}
          </Text>
          <Text fontSize="xs" textAlign="left">
            Board Name
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
