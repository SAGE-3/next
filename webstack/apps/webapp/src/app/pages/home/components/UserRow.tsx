/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';
import { User } from '@sage3/shared/types';
import { MdPerson, MdStar } from 'react-icons/md';

export function UserRow(props: { user: User; onClick: (user: User) => void }) {
  const borderColorValue = useColorModeValue(props.user.data.color, props.user.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.600');
  const borderColorG = useHexColor(borderColorGray);

  const offline = useHexColor('teal');
  const online = useHexColor('gray.700');
  return (
    <Box
      my="1"
      p="1"
      width="100%"
      display="flex"
      justifyContent={'space-between'}
      // alignContent={'center'}
      onClick={() => props.onClick(props.user)}
      borderRadius="md"
      _hover={{ cursor: 'pointer', background: borderColorG }}
    >
      <Box display="flex" alignItems={'center'}>
        <IconButton
          size="md"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="4xl"
          color={Math.random() > 0.5 ? offline : online}
          icon={<MdPerson />}
        ></IconButton>
        <Box display="flex" flexDir="column">
          <Text fontSize="sm" fontWeight="bold" textAlign="left">
            {props.user.data.name}
          </Text>
          <Text fontSize="xs" textAlign="left">
            Board Name
          </Text>
        </Box>
      </Box>
      <Box>
        {' '}
        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdStar />}></IconButton>
      </Box>
    </Box>
  );
}
