/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useCallback } from 'react';
import { useParams } from 'react-router';

// Theme and icons
import { Avatar, Tooltip, GridItem, Grid, Menu, MenuButton, MenuItem, MenuList, MenuGroup, useToast } from '@chakra-ui/react';
import { IoMdSquareOutline } from 'react-icons/io';
import { HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from 'react-icons/hi';
import { MdPerson, MdStop } from 'react-icons/md';

// Sage
import { usePresenceStore, useUser, initials, useHexColor, useUIStore, useThrottlePresenceUsers, UserAndPresence } from '@sage3/frontend';

// Hook to change your view to another user's viewport
function usePresenceViewport(myId: string) {
  // BoardId
  const { boardId } = useParams();
  // UI Store
  const { setBoardPosition, setScale } = useUIStore((state) => state);

  // Presences
  const { update: updatePresence } = usePresenceStore((state) => state);

  // Toast Info
  const infoToast = useToast({ id: 'infoToast-viewport' });

  // Go to a user's viewport
  const goToViewport = useCallback(
    (userId: string, userName: string) => {
      const target = usePresenceStore.getState().presences.find((el) => el._id === userId);
      if (!target) {
        infoToast.close('infoToast-viewport');
        infoToast({
          status: 'error',
          description: `Was unable to move to ${userName}'s view.`,
          duration: 3000,
          isClosable: true,
        });
      }
      if (target && myId) {
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
        updatePresence(myId, { following: '' });
        infoToast.close('infoToast-viewport');
        infoToast({
          status: 'info',
          description: `Moved to ${userName}'s view.`,
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [setBoardPosition, setScale]
  );

  const matchMyViewport = useCallback((userId: string) => {
    updatePresence(userId, { goToViewport: myId });
  }, []);

  const everyoneMatchMyViewport = useCallback(() => {
    // Get all users on this board
    const thisBoardsUsers = usePresenceStore.getState().presences.filter((el) => el.data.boardId === boardId);
    thisBoardsUsers.forEach((el) => {
      if (el._id !== myId) {
        matchMyViewport(el._id);
      }
    });
  }, []);

  return { goToViewport, matchMyViewport, everyoneMatchMyViewport };
}

function usePresenceFollow(myId: string) {
  // BoardId
  const { boardId } = useParams();

  // Presences
  const { update: updatePresence, following, setFollowing } = usePresenceStore((state) => state);

  // Follow a user
  const followUser = useCallback(
    (userId: string) => {
      const target = usePresenceStore.getState().presences.find((el) => el._id === userId);
      if (!target || !myId) return;
      if (target._id === myId || target._id === following) {
        // If you are already following this user, unfollow them
        setFollowing('');
        updatePresence(myId, { following: '' });
      } else {
        // If you are not following this user, follow them
        setFollowing(target._id);
        updatePresence(target._id, { following: '' });
        updatePresence(myId, { following: target._id });
      }
    },
    [following, updatePresence]
  );

  // Have everyone follow me
  const followMe = useCallback(
    (id?: string) => {
      const thisBoardsUsers = usePresenceStore.getState().presences.filter((el) => el.data.boardId === boardId);
      if (!myId) return;
      if (id) {
        // If id is provided, just one target user
        const target = thisBoardsUsers.find((el) => el._id === id);
        if (!target) return;
        updatePresence(target._id, { following: myId });
        updatePresence(myId, { following: '' });
      } else {
        // If id is not provided, all users on this board
        thisBoardsUsers.forEach((el) => {
          if (el._id === myId) {
            // If me set I am following no one now
            updatePresence(el._id, { following: '' });
          } else {
            updatePresence(el._id, { following: myId });
          }
        });
      }
    },
    [updatePresence]
  );

  // Have everyone stop following me
  const followMeStop = useCallback(
    (id?: string) => {
      const thisBoardsUsers = usePresenceStore.getState().presences.filter((el) => el.data.boardId === boardId);
      if (!myId) return;
      if (id) {
        // If id is provided, just one target user
        const target = thisBoardsUsers.find((el) => el._id === id);
        if (!target) return;
        updatePresence(target._id, { following: '' });
      } else {
        thisBoardsUsers.forEach((el) => {
          if (el.data.following === myId) updatePresence(el._id, { following: '' });
        });
      }
    },
    [updatePresence]
  );

  return { followUser, followMe, followMeStop, following };
}

type AvatarGroupProps = {
  boardId: string;
};

export function UserAvatarGroup(props: AvatarGroupProps) {
  // Get current user
  const { user } = useUser();
  if (!user) return null;

  // Get my color
  const myColor = useHexColor(user?.data.color ? user.data.color : 'orange');

  const { followUser, followMe, followMeStop, following } = usePresenceFollow(user?._id);
  const { goToViewport, matchMyViewport, everyoneMatchMyViewport } = usePresenceViewport(user?._id);

  // User Presence
  const userPresence = useThrottlePresenceUsers(1000, user?._id, props.boardId);

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
          <Menu>
            <Tooltip label={'You'} placement="top" hasArrow shouldWrapChildren={true}>
              <MenuButton
                as={Avatar}
                name={' '}
                backgroundColor={myColor}
                size="sm"
                color="white"
                showBorder={true}
                borderRadius={user?.data.userType === 'wall' ? '0%' : '100%'}
                borderColor="transparent"
                cursor="pointer"
                textAlign="center"
                fontWeight="bold"
                fontSize="14px"
              >
                <MdPerson
                  style={{
                    fontSize: '22px',
                    transform: 'translateX(3px)',
                  }}
                />
              </MenuButton>
            </Tooltip>

            <MenuList>
              <MenuGroup title={'You'} mt={0} mb={1} p={0} fontSize="md">
                <Tooltip label={'Force everyone to follow you'} placement="top" openDelay={400} hasArrow>
                  <MenuItem fontSize="sm" height="2em" icon={<HiOutlineChevronDoubleLeft />} onClick={() => followMe()}>
                    Follow Me
                  </MenuItem>
                </Tooltip>
                <Tooltip label={'Force everyone to unfollow you'} placement="top" openDelay={400} hasArrow>
                  <MenuItem fontSize="sm" height="2em" icon={<MdStop />} onClick={() => followMeStop()}>
                    Unfollow Me
                  </MenuItem>
                </Tooltip>
                <Tooltip label={'Force everyone to unfollow you'} placement="top" openDelay={400} hasArrow>
                  <MenuItem fontSize="sm" height="2em" icon={<IoMdSquareOutline />} onClick={everyoneMatchMyViewport}>
                    Match Me
                  </MenuItem>
                </Tooltip>
              </MenuGroup>
            </MenuList>
          </Menu>
        </GridItem>
        {userPresence.map((el) => {
          const followingYou = el.presence.data.following === user?._id;
          const yourFollowing = following === el.user._id;
          return (
            <UserAvatar
              key={`useravater-${el.presence._id}`}
              username={el.user.data.name}
              userId={el.user._id}
              color={el.user.data.color}
              isWall={el.user.data.userType === 'wall'}
              followingYou={followingYou}
              yourFollowing={yourFollowing}
              goToViewport={goToViewport}
              followMe={followMe}
              followMeStop={followMeStop}
              followUser={followUser}
              matchMe={matchMyViewport}
            />
          );
        })}
      </Grid>
    </>
  );
}

type UserAvatarProps = {
  username: string;
  userId: string;
  color: string;
  isWall: boolean;
  followingYou: boolean;
  yourFollowing: boolean;
  goToViewport: (userId: string, userName: string) => void;
  followMe: (userId?: string) => void;
  followMeStop: (userId?: string) => void;
  followUser: (userId: string) => void;
  matchMe: (userId: string) => void;
};

export function UserAvatar(props: UserAvatarProps) {
  const color = useHexColor(props.color);
  const { username, userId, isWall } = props;
  return (
    <GridItem w="100%" h="10" key={'userpanel-' + userId}>
      <Menu>
        <Tooltip aria-label="username" hasArrow={true} placement="top" label={username} shouldWrapChildren={true}>
          <MenuButton
            as={Avatar}
            name={' '}
            backgroundColor={color || 'orange'}
            size="sm"
            color="white"
            showBorder={true}
            borderRadius={isWall ? '0%' : '100%'}
            borderWidth={'3px'}
            borderColor={'transparent'}
            cursor="pointer"
            textAlign="center"
            fontWeight="bold"
            fontSize="13px"
            whiteSpace="nowrap"
            onDoubleClick={() => props.goToViewport(userId, username)}
          >
            {props.followingYou ? (
              <HiOutlineChevronDoubleLeft
                style={{
                  fontSize: '18px',
                  transform: 'translateX(4px)',
                }}
              />
            ) : props.yourFollowing ? (
              <HiOutlineChevronDoubleRight
                style={{
                  fontSize: '18px',
                  transform: 'translateX(4px)',
                }}
              />
            ) : (
              initials(username)
            )}
          </MenuButton>
        </Tooltip>
        <MenuList>
          <MenuGroup title={username} mt={0} mb={1} p={0} fontSize="md">
            <Tooltip hasArrow={true} placement="top" label={`${props.yourFollowing ? 'Unfollow' : 'Follow'} ${username}`} openDelay={400}>
              <MenuItem
                fontSize="sm"
                height="2em"
                icon={props.yourFollowing ? <MdStop /> : <HiOutlineChevronDoubleRight />}
                onClick={() => props.followUser(userId)}
              >
                {props.yourFollowing ? 'Unfollow' : 'Follow'}
              </MenuItem>
            </Tooltip>
            {props.followingYou ? (
              <Tooltip hasArrow={true} placement="top" label={`Force ${username} to unfollow`} openDelay={400}>
                <MenuItem fontSize="sm" height="2em" icon={<MdStop />} onClick={() => props.followMeStop(userId)}>
                  Unfollow Me
                </MenuItem>
              </Tooltip>
            ) : (
              <Tooltip hasArrow={true} placement="top" label={`Force ${username} to follow`} openDelay={400}>
                <MenuItem fontSize="sm" height="2em" icon={<HiOutlineChevronDoubleLeft />} onClick={() => props.followMe(userId)}>
                  Follow Me
                </MenuItem>
              </Tooltip>
            )}
            <Tooltip hasArrow={true} placement="top" label={`Match ${username}'s view`} openDelay={400}>
              <MenuItem fontSize="sm" height="2em" icon={<IoMdSquareOutline />} onClick={() => props.goToViewport(userId, username)}>
                Match Them
              </MenuItem>
            </Tooltip>
            <Tooltip hasArrow={true} placement="top" label={`Match ${username}'s view`} openDelay={400}>
              <MenuItem fontSize="sm" height="2em" icon={<IoMdSquareOutline />} onClick={() => props.matchMe(userId)}>
                Match Me
              </MenuItem>
            </Tooltip>
          </MenuGroup>
        </MenuList>
      </Menu>
    </GridItem>
  );
}
