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
import { MdPerson } from 'react-icons/md';

export function UserRow(props: { user: User }) {
  const borderColorValue = useColorModeValue(props.user.data.color, props.user.data.color);
  const borderColor = useHexColor(borderColorValue);

  const online = useHexColor('teal');
  const offline = useHexColor('gray.700');
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${borderColor}`}
      borderLeft={`solid 8px ${borderColor}`}
      transition={'all 0.2s ease-in-out'}
    >
      <Box display="flex" alignItems={'center'}>
        <IconButton
          size="md"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="4xl"
          color={borderColor}
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
            {props.user.data.name}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
