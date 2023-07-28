/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useCallback, useEffect, useState } from 'react';

// Theme and icons
import { Avatar, Tooltip, GridItem, Grid, Menu, MenuButton, MenuItem, MenuList, MenuGroup, useToast, Button } from '@chakra-ui/react';
import { GiArrowCursor } from 'react-icons/gi';
import { IoMdSquareOutline } from 'react-icons/io';
import { HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from 'react-icons/hi';
import { MdPerson, MdRemoveRedEye, MdStop } from 'react-icons/md';

// Sage
import { usePresenceStore, useUser, useUsersStore, initials, useHexColor, useUIStore } from '@sage3/frontend';
import { PresencePartial, User } from '@sage3/shared/types';
import { useParams } from 'react-router';

// Hook to change your view to another user's cursor position
function usePresenceCursor() {
  // Me and my current state
  const { user } = useUser();
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const scale = useUIStore((state) => state.scale);

  // Presences
  const presences = usePresenceStore((state) => state.presences);
  const updatePresence = usePresenceStore((state) => state.update);

  // Toast Info
  const infoToast = useToast();

  // Go to a user's cursor
  const goToCursor = useCallback(
    (userId: string, userName: string) => {
      const target = presences.find((el) => el._id === userId);
      const myId = user?._id;
      if (target && myId) {
        const cx = -target.data.cursor.x;
        const cy = -target.data.cursor.y;
        const wx = window.innerWidth / scale / 2;
        const wy = window.innerHeight / scale / 2;
        setBoardPosition({ x: cx + wx, y: cy + wy });
        updatePresence(myId, { following: '' });
        infoToast({
          status: 'info',
          description: `Moved to the cursor of ${userName}.`,
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [presences, scale, setBoardPosition, user]
  );

  return { goToCursor };
}

// Hook to change your view to another user's viewport
function usePresenceViewport() {
  // Me and my current state
  const { user } = useUser();

  // UI Store
  const { setBoardPosition, setScale, scale } = useUIStore((state) => state);

  // Presences
  const { presences, update: updatePresence } = usePresenceStore((state) => state);

  // Toast Info
  const infoToast = useToast();

  // Go to a user's viewport
  const goToViewport = useCallback(
    (userId: string, userName: string) => {
      const target = presences.find((el) => el._id === userId);
      const myId = user?._id;
      if (target && myId) {
        console.log(target);
        const vx = -target.data.viewport.position.x;
        const vy = -target.data.viewport.position.y;
        const vw = -target.data.viewport.size.width;
        const vh = -target.data.viewport.size.height;
        const vcx = vx + vw / 2;
        const vcy = vy + vh / 2;
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        const s = Math.min(ww / -vw, wh / -vh);
        const cx = vcx + ww / s / 2;
        const cy = vcy + wh / s / 2;
        setScale(s);
        setBoardPosition({ x: cx, y: cy });
        updatePresence(user._id, { following: '' });
        infoToast({
          status: 'info',
          description: `Moved to the viewport of ${userName}.`,
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [presences, setBoardPosition, setScale, user]
  );

  return { goToViewport };
}

function usePresenceFollow() {
  // BoardId
  const { boardId } = useParams();

  // Me and my current state
  const { user } = useUser();

  // Presences
  const { presences, update: updatePresence, following, setFollowing } = usePresenceStore((state) => state);

  // Toast Info
  const infoToast = useToast();

  // Follow a user
  const followUser = useCallback(
    (userId: string) => {
      const target = presences.find((el) => el._id === userId);
      const myId = user?._id;
      if (!target || !myId) return;
      if (target._id === myId || target._id === following) {
        // If you are already following this user, unfollow them
        setFollowing('');
        updatePresence(myId, { following: '' });
      } else if (target.data.following === myId) {
        // If the other user is following you, you can't follow them
        infoToast({
          status: 'error',
          description: `This user is already following you.`,
          duration: 3000,
          isClosable: true,
        });
        return;
      } else {
        // If you are not following this user, follow them
        setFollowing(target._id);
        updatePresence(myId, { following: target._id });
      }
    },
    [presences, user, following, updatePresence]
  );

  // Have everyone follow me
  const followMe = useCallback(() => {
    const myId = user?._id;
    const thisBoardsUsers = presences.filter((el) => el.data.boardId === boardId);
    if (!myId) return;
    thisBoardsUsers.forEach((el) => {
      if (el._id === myId) updatePresence(el._id, { following: '' });
      else updatePresence(el._id, { following: myId });
    });
  }, [presences, user, updatePresence]);

  // Have everyone stop following me
  const followMeStop = useCallback(() => {
    const myId = user?._id;
    const thisBoardsUsers = presences.filter((el) => el.data.boardId === boardId);
    if (!myId) return;
    thisBoardsUsers.forEach((el) => {
      if (el.data.following === myId) updatePresence(el._id, { following: '' });
    });
  }, [presences, user, updatePresence]);

  return { followUser, followMe, followMeStop, following };
}

type AvatarGroupProps = {
  boardId: string;
};
type UserAndPresence = { presence: PresencePartial; user: User };

export function UserAvatarGroup(props: AvatarGroupProps) {
  // Get current user
  const { user } = useUser();

  // Presence Functionality
  const { goToCursor } = usePresenceCursor();
  const { goToViewport } = usePresenceViewport();
  const { followUser, followMe, followMeStop, following } = usePresenceFollow();

  // Handlers
  const handleGoToCursor = (userId: string, userName: string) => goToCursor(userId, userName);
  const handleGoToViewport = (userId: string, userName: string) => goToViewport(userId, userName);
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
        <GridItem w="100%" h="10" key={'userpanel-' + user?._id}>
          <Tooltip aria-label="username" hasArrow={true} placement="top" label={'You'} shouldWrapChildren={true}>
            <Menu>
              <MenuButton
                as={Avatar}
                name={' '}
                backgroundColor={user?.data.color}
                size="sm"
                color="white"
                showBorder={true}
                borderRadius={user?.data.userType === 'wall' ? '0%' : '100%'}
                borderColor="white"
                cursor="pointer"
                textAlign="center"
                fontWeight="bold"
                fontSize="14px"
              >
                <MdPerson
                  style={{
                    fontSize: '18px',
                    transform: 'translateX(4px)',
                  }}
                />
              </MenuButton>
              <MenuList>
                <MenuGroup mt={0} mb={1} p={0} fontSize="md">
                  <MenuItem fontSize="sm" height="2em" icon={<HiOutlineChevronDoubleLeft />} onClick={() => followMe()}>
                    Everyone Follow Me
                  </MenuItem>
                  <MenuItem fontSize="sm" height="2em" icon={<MdStop />} onClick={() => followMeStop()}>
                    Everyone Stop Following Me
                  </MenuItem>
                </MenuGroup>
              </MenuList>
            </Menu>
          </Tooltip>
        </GridItem>
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
                      <MenuItem
                        fontSize="sm"
                        height="2em"
                        icon={<GiArrowCursor />}
                        onClick={() => handleGoToCursor(el.user._id, el.user.data.name)}
                      >
                        Show Cursor
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        height="2em"
                        icon={<IoMdSquareOutline />}
                        onClick={() => handleGoToViewport(el.user._id, el.user.data.name)}
                      >
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
