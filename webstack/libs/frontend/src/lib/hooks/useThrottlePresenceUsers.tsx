/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useCallback, useEffect } from 'react';
import { throttle } from 'throttle-debounce';

import { Presence, User } from '@sage3/shared/types';

import { usePresenceStore, useUsersStore } from '../stores';

export type UserAndPresence = { presence: Presence; user: User };

/**
 * Throttle hook for the apps store to reduce the amount of updates to react
 * Combines Users And Prensece Information
 * @param delay Delay to the amount of updates
 * @returns
 */
export function useThrottlePresenceUsers(delay: number, myId: string, boardId?: string) {
  const [userPresence, setUserPresence] = useState<UserAndPresence[]>([]);

  const updateThrottle = throttle(delay, () => {
    const users = useUsersStore.getState().users;
    const presences = usePresenceStore.getState().presences;
    const newUserPresence: UserAndPresence[] = [];
    users.forEach((u) => {
      const presence = presences.find((p) => p.data.userId === u._id);
      if (presence && presence.data.userId !== myId) {
        if (boardId && presence.data.boardId !== boardId) {
          return;
        } else {
          newUserPresence.push({ user: u, presence });
        }
      }
    });
    setUserPresence(newUserPresence);
  });
  // Keep the reference
  const updateRef = useCallback(updateThrottle, []);
  // Connect to the store on mount, disconnect on unmount, catch state-changes in a reference
  useEffect(() => {
    usePresenceStore.subscribe((state) => {
      updateRef();
    });
    updateRef();
  }, []);

  return userPresence;
}
