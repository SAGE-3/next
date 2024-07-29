/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useCallback, useEffect } from 'react';
import { useParams } from 'react-router';

import { Button, useToast } from '@chakra-ui/react';

// Sage
import { usePresenceStore, useUser, useUsersStore, initials, useHexColor, useUIStore } from '@sage3/frontend';

export function PresenceFollow() {
  // BoardId
  const { boardId } = useParams();

  // Me and my current state
  const { user } = useUser();

  // UI Store
  const { setBoardPosition, setScale } = useUIStore((state) => state);

  // Presences
  const { presences, update: updatePresence, following, setFollowing } = usePresenceStore((state) => state);
  const users = useUsersStore((state) => state.users);

  // Toast Info
  const followingToast = useToast({ id: 'followingToast' });
  const matchToast = useToast({ id: 'matchToast' });

  // My Presence
  const myPresence = usePresenceStore.getState().presences.find((el) => el._id === user?._id);

  const setViewport = useCallback((userId: string) => {
    // Get the presence of the user
    const presence = usePresenceStore.getState().presences.find((el) => el._id === userId);
    if (!presence) return;
    // Get viewport information
    const { position, size } = presence.data.viewport;
    const vx = -position.x;
    const vy = -position.y;
    const vw = -size.width;
    const vh = -size.height;
    const vcx = vx + vw / 2;
    const vcy = vy + vh / 2;
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const s = Math.min(ww / -vw, wh / -vh);
    const cx = vcx + ww / s / 2;
    const cy = vcy + wh / s / 2;
    setScale(s);
    setBoardPosition({ x: cx, y: cy });
  }, []);

  function startFollowing(userId: string) {
    setFollowing(userId);
    const userName = users.find((el) => el._id === userId)?.data.name;
    followingToast.close('followingToast');
    followingToast({
      status: 'info',
      description: (
        <p>
          You are following {userName}.
          <Button ml="2" size="xs" colorScheme="red" onClick={stopFollowing}>
            Stop
          </Button>
        </p>
      ),
      duration: null,
      isClosable: false,
      position: 'bottom',
    });
  }

  function stopFollowing() {
    if (!user) return;
    setFollowing('');
    updatePresence(user?._id, { following: '' });
    followingToast.close('followingToast');
  }

  useEffect(() => {
    const goToViewport = myPresence?.data.goToViewport;
    if (!goToViewport || !user) return;
    const userName = users.find((el) => el._id === goToViewport)?.data.name;
    matchToast({
      status: 'info',
      title: 'Matched View',
      description: `You matched the view of ${userName}`,
      duration: 2000,
      isClosable: false,
      position: 'bottom',
    });
    updatePresence(user?._id, { goToViewport: '' });
    setViewport(goToViewport);
  }, [myPresence?.data.goToViewport, user]);

  // Check if I am following someone
  useEffect(() => {
    // Check for my presence
    const myPresence = presences.find((el) => el._id === user?._id);
    if (!myPresence) return;

    // Check if I am following someone
    const target = myPresence.data.following;
    if (!target) {
      setFollowing('');
      followingToast.close('followingToast');
      return;
    }
    // Check if that person is still connected
    const targetPresence = presences.find((el) => el._id === target);
    if (!targetPresence) {
      // If not, stop following them
      stopFollowing();
      return;
    }

    // Check if that person is still on this board
    if (targetPresence.data.boardId !== boardId) {
      // If not, stop following them
      stopFollowing();
      return;
    }

    // Is this a new person I am following?
    if (target !== following) {
      startFollowing(target);
      return;
    }
  }, [presences, following]);

  // Update view if I am following someone
  useEffect(() => {
    if (!following) return;
    const target = presences.find((el) => el._id === following);
    if (!target) return;
    setViewport(target.data.userId);
  }, [following, presences]);

  return null;
}
