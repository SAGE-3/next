/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useEffect, useState } from 'react';

// Sage
import { usePresenceStore, useUser, useUsersStore, initials, useHexColor, useUIStore } from '@sage3/frontend';
import { Presence, User } from '@sage3/shared/types';

// Theme and icons
import { Avatar, Tooltip, GridItem, Grid, Menu, MenuButton, MenuItem, MenuList, MenuGroup, useToast } from '@chakra-ui/react';
import { GiArrowCursor } from 'react-icons/gi';
import { IoMdSquareOutline } from 'react-icons/io';
import { HiOutlineChevronDoubleRight } from 'react-icons/hi';
import { MdRemoveRedEye } from 'react-icons/md';

type AvatarGroupProps = {
  boardId: string;
};

type UserAndPresence = { presence: Presence; user: User };
export function UserAvatarGroup(props: AvatarGroupProps) {
  // Get current user
  const { user } = useUser();

  // User you are currently following
  const [following, setFollowing] = useState<UserAndPresence | null>(null);

  // PrsenceStore
  const updatePresence = usePresenceStore((state) => state.update);

  // UI Stuff
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  const scale = useUIStore((state) => state.scale);
  const toast = useToast();

  // Get all users
  const users = useUsersStore((state) => state.users);
  // Get presences of users
  let presences = usePresenceStore((state) => state.presences);

  // Filter out the users who are not present on the board and is not the current user
  presences = presences.filter((el) => el.data.boardId === props.boardId && el._id !== user?._id);

  // Combine users and presences
  const userPresence: UserAndPresence[] = presences
    .filter((p) => users.find((u) => u._id === p._id))
    .map((p) => {
      return {
        presence: p,
        user: users.find((u) => u._id === p._id) as User,
      };
    });

  useEffect(() => {
    // If not following anyone, exit
    if (!following) return;
    const u = userPresence.find((el) => el.presence._id === following.presence._id);
    // Check if the you are following is still on this board
    if (!u) {
      user && updatePresence(user?._id, { following: '' });
      setFollowing(null);
    } else {
      // Set you position to their current position
      goToViewport(u);
    }
  }, [userPresence, following, user]);

  // If the user closed the UserPanel, stop following
  useEffect(() => {
    return () => {
      user && updatePresence(user?._id, { following: '' });
      setFollowing(null);
    };
  }, []);

  // Sort walls to top
  userPresence.sort((a, b) => {
    const aType = a?.user.data.userType === 'wall' ? 0 : 1;
    const bType = b?.user.data.userType === 'wall' ? 0 : 1;
    return aType - bType;
  })

  // Go to the user's cursor
  function goToCursor(user: UserAndPresence) {
    if (user) {
      const cx = -user.presence.data.cursor.x;
      const cy = -user.presence.data.cursor.y;
      const wx = window.innerWidth / scale / 2;
      const wy = window.innerHeight / scale / 2;

      setBoardPosition({ x: cx + wx, y: cy + wy });
    }
  }

  // Go to the user's viewport
  function goToViewport(user: UserAndPresence) {
    if (user) {
      const type = user.user.data.userType;
      const vx = -user.presence.data.viewport.position.x;
      const vy = -user.presence.data.viewport.position.y;
      const vw = -user.presence.data.viewport.size.width;
      const vh = -user.presence.data.viewport.size.height;
      const vcx = vx + vw / 2;
      const vcy = vy + vh / 2;

      const ww = window.innerWidth;
      const wh = window.innerHeight;

      const s = Math.min(ww / -vw, wh / -vh);
      const cx = vcx + ww / s / 2;
      const cy = vcy + wh / s / 2;

      setScale(s);
      setBoardPosition({ x: cx, y: cy });
    }
  }

  // Follow a user
  function followUser(u: UserAndPresence) {
    if (!user) return;
    if (u.user._id === following?.user._id) {
      setFollowing(null);
      user && updatePresence(user._id, { following: '' });
    } else {
      // If the other user is following you, you can't follow them
      if (u.presence.data.following === user._id) {
        toast({
          status: 'error',
          description: `${u.user.data.name} is already following you.`,
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      setFollowing(u);
      user && updatePresence(user._id, { following: u.user._id });
    }
  }

  return (
    <>
      <Grid templateColumns="repeat(10, 0fr)" gap={2}>
        {userPresence.map((el) => {
          if (el == null) return;
          const color = useHexColor(el.user.data.color);
          const isWall = el.user.data.userType === 'wall';
          const followingThisUser = following?.user._id === el.user._id;
          return (
            <GridItem w="100%" h="10" key={'userpanel-' + el.user._id}>
              <Tooltip
                key={el.presence.data.userId}
                aria-label="username"
                hasArrow={true}
                placement="top"
                label={el.user.data.name}
                shouldWrapChildren={true}
              >
                <Menu>
                  <MenuButton
                    as={Avatar}
                    name={' '}
                    backgroundColor={color || 'orange'}
                    size="sm"
                    color="white"
                    showBorder={true}
                    borderRadius={isWall ? '0%' : '100%'}
                    borderColor="transparent"
                    cursor="pointer"
                    textAlign="center"
                    fontWeight="bold"
                    fontSize="14px"
                  >
                    {followingThisUser ? (
                      <MdRemoveRedEye
                        style={{
                          fontSize: '18px',
                          transform: 'translateX(4px)',
                        }}
                      />
                    ) : (
                      initials(el.user.data.name)
                    )}
                  </MenuButton>
                  <MenuList>
                    <MenuGroup title={el.user.data.name}>
                      <MenuItem height="30px" icon={<GiArrowCursor />} onClick={() => goToCursor(el)}>
                        Show Cursor
                      </MenuItem>
                      <MenuItem height="30px" icon={<IoMdSquareOutline />} onClick={() => goToViewport(el)}>
                        Show View
                      </MenuItem>
                      <MenuItem height="30px" icon={<HiOutlineChevronDoubleRight />} onClick={() => followUser(el)}>
                        {followingThisUser ? 'Unfollow' : 'Follow'}
                      </MenuItem>
                    </MenuGroup>
                  </MenuList>
                </Menu>
              </Tooltip>
            </GridItem>
          );
        })}
      </Grid>
    </>
  );
}
