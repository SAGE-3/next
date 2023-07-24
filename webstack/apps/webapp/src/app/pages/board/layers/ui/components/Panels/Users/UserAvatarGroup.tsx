/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useEffect, useState } from 'react';

// Theme and icons
import { Avatar, Tooltip, GridItem, Grid, Menu, MenuButton, MenuItem, MenuList, MenuGroup, useToast } from '@chakra-ui/react';
import { GiArrowCursor } from 'react-icons/gi';
import { IoMdSquareOutline } from 'react-icons/io';
import { HiOutlineChevronDoubleRight } from 'react-icons/hi';
import { MdRemoveRedEye } from 'react-icons/md';

// Sage
import { usePresenceStore, useUser, useUsersStore, initials, useHexColor, useUIStore } from '@sage3/frontend';
import { PresencePartial, User } from '@sage3/shared/types';
import { useParams } from 'react-router';

function usePresenceGoTo() {
  // BoardId
  const { boardId } = useParams();
  const { user } = useUser();
  const presences = usePresenceStore((state) => state.presences);
  const updatePresence = usePresenceStore((state) => state.update);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  const scale = useUIStore((state) => state.scale);

  // User you are currently following
  const [following, setFollowing] = useState<string | null>(null);

  const toast = useToast();
  // Go to the user's cursor
  function goToCursor(userId: string) {
    const user = presences.find((el) => el._id === userId);
    if (user) {
      const cx = -user.data.cursor.x;
      const cy = -user.data.cursor.y;
      const wx = window.innerWidth / scale / 2;
      const wy = window.innerHeight / scale / 2;
      setBoardPosition({ x: cx + wx, y: cy + wy });
    }
  }

  // Go to the user's viewport
  function goToViewport(userId: string) {
    const user = presences.find((el) => el._id === userId);
    if (user) {
      const vx = -user.data.viewport.position.x;
      const vy = -user.data.viewport.position.y;
      const vw = -user.data.viewport.size.width;
      const vh = -user.data.viewport.size.height;
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
  function followUser(userId: string) {
    const target = presences.find((el) => el._id === userId);
    if (!target || !user) return;
    // If you are already following this user, unfollow them
    if (target._id === user._id || target._id === following) {
      setFollowing(null);
      updatePresence(user._id, { following: '' });
    } else {
      // If the other user is following you, you can't follow them
      if (target.data.following === user._id) {
        toast({
          status: 'error',
          description: `This user is already following you.`,
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      setFollowing(target._id);
      updatePresence(user._id, { following: target._id });
    }
  }

  useEffect(() => {
    // If not following anyone, exit
    if (!following) return;
    const u = presences.find((el) => el._id === following);
    // Check if the you are following is still on this board
    if (!u || u.data.boardId !== boardId) {
      user && updatePresence(user?._id, { following: '' });
      setFollowing(null);
    } else {
      // Set you position to their current position
      goToViewport(following);
    }
  }, [presences, following, user]);

  return { goToCursor, goToViewport, followUser, following };
}

type AvatarGroupProps = {
  boardId: string;
};

type UserAndPresence = { presence: PresencePartial; user: User };
export function UserAvatarGroup(props: AvatarGroupProps) {
  // Get current user
  const { user } = useUser();

  // UI Stuff
  const { goToCursor, goToViewport, followUser, following } = usePresenceGoTo();

  // Handlers
  const handleGoToCursor = (userId: string) => goToCursor(userId);
  const handleGoToViewport = (userId: string) => goToViewport(userId);
  const handleFollowUser = (userId: string) => followUser(userId);

  // Get all users
  const users = useUsersStore((state) => state.users);
  // Get presences of users
  let presences = usePresenceStore((state) => state.partialPrescences);
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

  // Sort walls to top
  userPresence.sort((a, b) => {
    const aType = a?.user.data.userType === 'wall' ? 0 : 1;
    const bType = b?.user.data.userType === 'wall' ? 0 : 1;
    return aType - bType;
  });

  return (
    <>
      <Grid templateColumns="repeat(10, 0fr)" gap={2}>
        {userPresence.map((el) => {
          if (el == null) return;
          const color = useHexColor(el.user.data.color);
          const isWall = el.user.data.userType === 'wall';
          const followingThisUser = following === el.user._id;
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
                    <MenuGroup title={el.user.data.name} mt={0} mb={1} p={0} fontSize="md">
                      <MenuItem fontSize="sm" height="2em" icon={<GiArrowCursor />} onClick={() => handleGoToCursor(el.user._id)}>
                        Show Cursor
                      </MenuItem>
                      <MenuItem fontSize="sm" height="2em" icon={<IoMdSquareOutline />} onClick={() => handleGoToViewport(el.user._id)}>
                        Show View
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        height="2em"
                        icon={<HiOutlineChevronDoubleRight />}
                        onClick={() => handleFollowUser(el.user._id)}
                      >
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
