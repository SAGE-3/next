/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * 
 * @file User Provider
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { Presence, PresenceSchema } from '@sage3/shared/types';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIHttp, SocketAPI } from '../api';
import { useAuth } from './useAuth';

const PresenceContext = createContext({
  presence: undefined as Presence | undefined,
  update: null as ((updates: Partial<PresenceSchema>) => Promise<void>) | null,
});

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const auth = useAuth();
  const [presence, setPresence] = useState<Presence | undefined>(undefined)

  useEffect(() => {

    let presenceSub: (() => void) | null = null;

    async function fetchPresence() {
      // Subscribe to presence updates
      const route = `/presence/${auth.auth?.id}`;
      presenceSub = await SocketAPI.subscribe<PresenceSchema>(route, (message) => {
        const doc = message.doc as Presence;
        switch (message.type) {
          case 'CREATE': {
            setPresence(doc)
            break;
          }
          case 'UPDATE': {
            setPresence(doc)
            break;
          }
          case 'DELETE': {
            setPresence(undefined)
          }
        }
      });

      if (auth.auth) {
        // Check if presence doc exists
        const presenceResponse = await APIHttp.GET<PresenceSchema, Presence>(`/presence/${auth.auth.id}`);

        // If account exists, set the user context and subscribe to updates
        if (presenceResponse.data) {
          setPresence(presenceResponse.data[0]);
        } else {
          // Else Create doc and set it
          const presenceResponse = await APIHttp.POST<PresenceSchema, Presence>('/presence/create', {
            userId: auth.auth.id,
            status: 'online',
            roomId: '',
            boardId: '',
            cursor: { x: 0, y: 0, z: 0 },
            viewport: {
              position: { x: 0, y: 0, z: 0 },
              size: { width: 0, height: 0, depth: 0 },
            }
          });
          if (presenceResponse.data) {
            setPresence(presenceResponse.data[0])
          }
        }
      }
    }

    if (auth.auth) {
      fetchPresence()
    }

    return () => {
      if (presenceSub) {
        presenceSub();
      }
    }
  }, [auth])


  /**
   * Update the current user
   * @param updates Updates to apply to the user
   * @returns 
   */
  async function update(updates: Partial<PresenceSchema>): Promise<void> {
    if (presence) {
      await APIHttp.PUT<PresenceSchema>(`/presence/${presence.data.userId}`, updates);
      return;
    }
    return;
  }

  return (
    <PresenceContext.Provider value={{ presence, update }}>
      {props.children}
    </PresenceContext.Provider>
  );
}
