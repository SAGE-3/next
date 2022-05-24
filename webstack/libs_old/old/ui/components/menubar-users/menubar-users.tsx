/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Avatar, AvatarGroup, Box, Tooltip } from '@chakra-ui/react';
import { SAGE3State, UserPresence } from '@sage3/shared/types';
import { initials } from '@sage3/frontend/utils/misc/strings';
import React, { useEffect, useRef, useState } from 'react';

import { usePanZoom, useUser, useUsers } from '@sage3/frontend/services';
import { RemoteWallModal } from '../remotewall-modal/remotewall-modal';
import { MdRemoveRedEye } from 'react-icons/md';

export interface MenubarUsersProps {
  boardId: string;
  canvasSize: { width: number; height: number };
  apps: SAGE3State['apps'];
}

/**
 * Component showing the list of avatar
 * @param props
 * @returns
 */
export function MenubarUsers(props: MenubarUsersProps) {
  // Get the user data to display
  const users = useUsers();
  const { id } = useUser();

  // Current user to follow
  const [userToFollow, setUserToFollow] = useState<UserPresence | undefined>(undefined);

  const [, dispatchPanZoom] = usePanZoom();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<string>();

  useInterval(() => {
    if (userToFollow) {
      // Find user in list of users
      for (let i = 0; i < users.length; i++) {
        // Find user by using the UID
        if (userToFollow.id === users[i].id && userToFollow.boardId === props.boardId) {
          // Check to see if user has left the board
          if (users[i].boardId !== props.boardId) {
            setUserToFollow(undefined);
          } else {
            // Pan to the user's position and zoom level
            dispatchPanZoom({ type: 'zoom-set', zoomValue: users[i].view.s });
            dispatchPanZoom({
              type: 'translate-to',
              position: {
                x: users[i].view.x - users[i].view.w / 2,
                y: users[i].view.y - users[i].view.h / 2,
              },
            });
          }
        }
      }
    }
  }, 300);

  return (
    <AvatarGroup transform="translate(10px,0px)" max={20} size="sm" spacing="1">
      {users.map((user: UserPresence) => {
        if (user.boardId === props.boardId && user.id != id) {
          const timeZone = user.timeZone;
          const time = new Date(new Date().getTime() + (new Date().getTimezoneOffset() - user.timeOffset) * 60000);
          const usertime = time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
          return (
            <Tooltip
              key={user.id}
              label={`${user.name} | ${usertime} | ${timeZone}`}
              aria-label="A tooltip"
              hasArrow={true}
              placement="bottom-start"
            >
              <Avatar
                key={user.id}
                bg={user.color}
                color="white"
                mr={2}
                // If following user, show an eye
                icon={userToFollow ? userToFollow.id === user.id ? <MdRemoveRedEye fontSize="1.5rem" /> : undefined : undefined}
                size="sm"
                textShadow={'0 0 2px #000'}
                cursor="pointer"
                borderRadius={user.userType == 'wall' ? '0%' : '100%'}
                showBorder={true}
                borderColor="whiteAlpha.600"
                getInitials={initials}
                name={userToFollow ? (userToFollow.id === user.id ? undefined : user.name) : user.name}
                onClick={() => {
                  if (user.userType !== 'wall') {
                    if (user.view) {
                      if (userToFollow) {
                        // Check to see if the user is already following someone
                        if (userToFollow.id === user.id) {
                          // If user clicks the same user, remove the user from following
                          setUserToFollow(undefined);
                        } else {
                          // if user clicks a different user, follow the user
                          setUserToFollow(user);
                        }
                      } else {
                        // If the user is not following someone, follow the user
                        setUserToFollow(user);
                      }
                    } else {
                      // Set the center around the cursor of the user
                      dispatchPanZoom({ type: 'translate-to', position: { x: user.cursor[0], y: user.cursor[1] } });
                    }
                  } else if (user.userType == 'wall') {
                    // This seems hacky but it works
                    setModalUser(user.id);
                    setModalOpen(true);
                    setTimeout(() => setModalOpen(false), 1000);
                  }
                }}
              >
                {user.userRole == 'guest' ? (
                  <div
                    style={{
                      borderRadius: '100%',
                      color: 'black',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      lineHeight: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      height: '0.75rem',
                      width: '0.75rem',
                      transform: 'translate(-10px, 10px)',
                      position: 'absolute',
                    }}
                  >
                    G
                  </div>
                ) : null}
              </Avatar>
            </Tooltip>
          );
        } else {
          return null;
        }
      })}
      <RemoteWallModal open={modalOpen} userId={modalUser} canvasSize={props.canvasSize} apps={props.apps} boardId={props.boardId} />
    </AvatarGroup>
  );
}

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (!delay && delay !== 0) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}
