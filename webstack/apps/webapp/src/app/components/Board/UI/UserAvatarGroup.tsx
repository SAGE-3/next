/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Avatar, Box, Tooltip, AvatarGroup } from '@chakra-ui/react';

import { usePresenceStore, useUser, useUsersStore, initials } from '@sage3/frontend';

type AvatarGroupProps = {
  boardId: string;
};

export function UserAvatarGroup(props: AvatarGroupProps) {
  // Get current user
  const { user } = useUser();
  // Get all users
  const users = useUsersStore((state) => state.users);
  // Get presences of users
  let presences = usePresenceStore((state) => state.presences);
  // Filter out the users who are not present on the board and is not the current user
  presences = presences.filter((el) => el.data.boardId === props.boardId && el._id !== user?._id);

  return (
    <Box display="flex" flexDirection="row" alignItems="baseline">
      <AvatarGroup max={6} size="sm">
        {presences.map((presence) => {
          const user = users.find((el) => el._id === presence._id);
          if (!user) return null;
          return (
            <Tooltip key={presence.data.userId} aria-label="username" hasArrow={true} placement="top-start" label={user.data.name}>
              <Avatar
                name={user.data.name}
                getInitials={initials}
                backgroundColor={user.data.color}
                size="sm"
                mx={1}
                color="white"
                showBorder={true}
                borderWidth={'1px'}
                borderColor="whiteAlpha.600"
              />
            </Tooltip>
          );
        })}
      </AvatarGroup>
    </Box>
  );
}
