/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Avatar, Box } from '@chakra-ui/react';
import { usePresenceStore } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';

type AvatarGroupProps = {
  boardId: string;
};

export function AvatarGroup(props: AvatarGroupProps) {
  const presences = usePresenceStore((state) => state.presences);
  const users = presences.filter((el) => el.data.boardId === props.boardId);

  return (
    <Box display="flex" flexDirection="row" alignItems="baseline">
      {users.map((user) => {
        return <Avatar key={user.data.userId} name={user.data.userId} size="sm" mx={1} backgroundColor="teal" color="white" />;
      })}
    </Box>
  );
}
