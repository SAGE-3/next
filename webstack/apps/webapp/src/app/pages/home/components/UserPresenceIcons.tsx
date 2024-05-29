/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, Box, Avatar, AvatarBadge, AvatarGroup, BoxProps} from '@chakra-ui/react';

import { useHexColor, useUsersStore } from '@sage3/frontend';
import { User, Presence } from '@sage3/shared/types';

// Required to Fix React Hook Order Changes
function UserIcons(props: { users: User[], currentUser: Presence, anonymousNames?: boolean }){
  const user = props.users.find((user) => user._id === props.currentUser.data.userId)
  const backgroundColorValue = useColorModeValue(`${user?.data.color}.600`, `${user?.data.color}.400`);
  const backgroundColor = useHexColor(backgroundColorValue);
  return <Avatar name={props.anonymousNames ? undefined : user?.data.name} backgroundColor={backgroundColor} borderColor={"grey.400"}/>
}

export function UserPresenceIcons(props: { usersPresent: Presence[], maxUsersDisplayed: number, anonymousNames?: boolean } & Omit<BoxProps, 'usersPresent' | 'maxUsersDisplayed' | 'anonymousNames'>) {
  const { usersPresent, maxUsersDisplayed, anonymousNames, ...boxProps } = props;
  const { users } = useUsersStore((state) => state);
  return (
        <Box {...boxProps}>
          <AvatarGroup size='md' max={props.maxUsersDisplayed}>
            {props.usersPresent.map((pUser, index) => 
              <Box key={index}>
                <UserIcons users={users} currentUser={pUser} anonymousNames={props.anonymousNames}/>
              </Box>
            )}
          </AvatarGroup>
        </Box>

  );
}
