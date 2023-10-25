/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Image, Box, Text, useColorModeValue } from '@chakra-ui/react';
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

  const joinedDate = props.user ? new Date(props.user._createdAt).toDateString() : 'N/A';
  const email = props.user ? props.user.data.email : 'N/A';

  return (
    <Box
      display="flex"
      flexDirection="column"
      borderRadius="md"
      height="220px"
      border={`solid ${borderColor} 2px`}
      background={linearBGColor}
      padding="8px"
    >
      <Box display="flex" justifyContent={'space-between'}>
        <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="2xl" fontWeight={'bold'}>
            {title}
          </Box>
          <Box display="flex" justifyContent={'left'} gap="8px"></Box>
        </Box>
      </Box>
      <Box flex="1" display="flex" my="4" px="2" flexDir="column">
        <Box>
          {props.user && (
            <table>
              <tr>
                <td width="60px">
                  <Text fontSize="sm" fontWeight={'bold'}>
                    Joined
                  </Text>
                </td>
                <td>
                  <Text fontSize="sm">{joinedDate}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text fontSize="sm" fontWeight={'bold'}>
                    Email
                  </Text>
                </td>
                <td>
                  <Text fontSize="sm">{email}</Text>
                </td>
              </tr>
            </table>
          )}
        </Box>
      </Box>
    </Box>
  );
}
