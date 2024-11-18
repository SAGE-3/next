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
import {
  Tooltip,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuGroup,
  useToast,
  Button,
  Divider,
  Box,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

// Theme and icons
import { MdPerson, MdStop } from 'react-icons/md';
import { IoMdSquareOutline } from 'react-icons/io';
import { HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from 'react-icons/hi';

// Sage
import { usePresenceStore, useUser, useHexColor, useUIStore, useThrottlePresenceUsers } from '@sage3/frontend';


// Hook to change your view to another user's viewport
function usePresenceViewport(myId: string) {
  // BoardId
  const { boardId } = useParams();
  // UI Store
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);

  // Presences
  const updatePresence = usePresenceStore((state) => state.update);

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
  const updatePresence = usePresenceStore((state) => state.update);
  const following = usePresenceStore((state) => state.following);
  const setFollowing = usePresenceStore((state) => state.setFollowing);

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

type UsersMenuProps = {
  boardId: string;
};

export function UsersMenu(props: UsersMenuProps) {
  // Get current user
  const { user } = useUser();
  if (!user) return null;

  // Get my color
  const myColor = useHexColor(user?.data.color ? user.data.color : 'orange');

  const { followUser, followMe, followMeStop, following } = usePresenceFollow(user?._id);
  const { goToViewport, matchMyViewport, everyoneMatchMyViewport } = usePresenceViewport(user?._id);

  // User Presence
  const userPresence = useThrottlePresenceUsers(1000, user?._id, props.boardId);

  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // Sort walls to top
  userPresence.sort((a, b) => {
    const aType = a?.user.data.userType === 'wall' ? 0 : 1;
    const bType = b?.user.data.userType === 'wall' ? 0 : 1;
    return aType - bType;
  });

  return (
    <Box>
      <VStack
        maxH={300}
        w={'100%'}
        m={0}
        pr={2}
        spacing={2}
        overflow="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: gripColor,
            borderRadius: 'md',
          },
        }}
      >
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
      </VStack>
      <Divider my="2" />
      <Menu>
        <Tooltip label={'You'} placement="top" hasArrow shouldWrapChildren={true}>
          <MenuButton as={Button} size="xs" width="150px" textAlign={'left'} leftIcon={<MdPerson fontSize={'16px'} color={myColor} />}>
            {'You'}
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
    </Box>
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
    <Menu>
      <MenuButton
        as={Button}
        size="xs"
        width="150px"
        textAlign={'left'}
        minHeight="24px"
        leftIcon={isWall ? <MdStop fontSize={'16px'} color={color} /> : <MdPerson fontSize={'16px'} color={color} />}
      >
        {username}
      </MenuButton>
      <MenuList>
        <MenuGroup title={username} mt={0} mb={1} p={0} fontSize="md">
          <Tooltip hasArrow={true} placement="top" label={`${props.yourFollowing ? 'Unfollow' : 'Follow'} ${username}`} openDelay={400}>
            <MenuItem
              fontSize="sm"
              height="2em"
              icon={props.yourFollowing ? <MdStop /> : <HiOutlineChevronDoubleRight />}
              onClick={() => props.followUser(userId)}
            >
              {props.yourFollowing ? 'Unfollow Them' : 'Follow Them'}
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
  );
}
