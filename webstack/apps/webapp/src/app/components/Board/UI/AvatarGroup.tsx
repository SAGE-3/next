/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Avatar, Box } from '@chakra-ui/react';
import { usePresenceStore, useUser, useUsersStore } from '@sage3/frontend';

type AvatarGroupProps = {
  boardId: string;
};

export function AvatarGroup(props: AvatarGroupProps) {

  // Get current user
  const {user} = useUser();
  // Get all users
  const users = useUsersStore(state=>state.users);
  // Get presences of users
  let presences = usePresenceStore((state) => state.presences);
  // Filter out the users who are not present on the board and is not the current user
  presences = presences.filter((el) => ( el.data.boardId === props.boardId && el._id !== user?._id));

  return (
    <Box display="flex" flexDirection="row" alignItems="baseline">
      {presences.map((presence) => {
        return <Avatar key={presence.data.userId} name={users.find(el => el._id === presence._id)?.data.name} size="sm" mx={1} backgroundColor="teal" color="white" />;
      })}
    </Box>
  );
}
