/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Box, Text, useColorModeValue } from '@chakra-ui/react';
import { MdEdit } from 'react-icons/md';
import { Presence, User } from '@sage3/shared/types';
import { useHexColor } from '@sage3/frontend';

type UserCardProps = {
  user: User | undefined;
  presence: Presence | undefined;
};

export function UserCard(props: UserCardProps) {
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const borderColor = useHexColor(props.user ? props.user.data.color : 'gray');
  const title = props.user ? props.user.data.name : 'No User Selected';

  const joinedDate = props.user ? new Date(props.user._createdAt).toLocaleDateString() : 'N/A';

  return (
    <Box
      display="flex"
      flexDirection="column"
      borderRadius="md"
      height="200px"
      border={`solid ${borderColor} 2px`}
      background={linearBGColor}
      padding="8px"
    >
      <Box display="flex" justifyContent={'space-between'}>
        <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
          <Text fontSize="2xl">{title}</Text>
          <Box display="flex" justifyContent={'left'} gap="8px"></Box>
        </Box>
      </Box>
      <Box flex="1" display="flex" my="4" px="2" flexDir="column">
        <Box>
          {props.user && (
            <>
              <Text fontSize="sm">{props.user.data.email}</Text>
              <Text fontSize="sm">Joined: {joinedDate}</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
