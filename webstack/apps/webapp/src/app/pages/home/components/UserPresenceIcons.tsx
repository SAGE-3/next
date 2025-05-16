/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, Box, Avatar, AvatarGroup } from '@chakra-ui/react';

import { User, PresencePartial } from '@sage3/shared/types';
import { useHexColor, useUsersStore, initials } from '@sage3/frontend';

export function UserPresenceIcons(
  props: { usersPresent: PresencePartial[]; maxUsersDisplayed: number; anonymousNames?: boolean }
) {
  const { usersPresent, maxUsersDisplayed, anonymousNames } = props;
  const users = useUsersStore((state) => state.users);

  return (
    <Box overflow="hidden" width={150} height={20}>
      <AvatarGroup size="sm" max={maxUsersDisplayed}>
        {usersPresent.map((pUser, index) => (
          <Box key={index}>
            <UserIcons users={users} currentUser={pUser} anonymousNames={anonymousNames} />
          </Box>
        ))}
      </AvatarGroup>
    </Box>
  );
}

// Required to Fix React Hook Order Changes
function UserIcons(props: { users: User[]; currentUser: PresencePartial; anonymousNames?: boolean }) {
  const user = props.users.find((user) => user._id === props.currentUser.data.userId);
  const backgroundColorValue = useColorModeValue(`${user?.data.color}.600`, `${user?.data.color}.400`);
  const backgroundColor = useHexColor(backgroundColorValue);
  const name = props.anonymousNames ? undefined : user ? initials(user.data.name) : undefined;
  return (
    <Avatar
      name={' '}
      color={'var(--chakra-colors-body-text)'}
      backgroundColor={backgroundColor}
      borderColor={'grey.400'}
      textAlign="center"
      whiteSpace="nowrap"
      size="sm"
    >
      {name}
    </Avatar>
  );
}
