/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * 
 * @file Presence Provider
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { Presence, PresenceSchema } from '@sage3/shared/types';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIHttp, SocketAPI } from '../api';
import { useAuth } from './useAuth';

const PresenceContext = createContext({
  presence: {} as Presence,
  update: (async (id: string, updates: Partial<PresenceSchema>) => Promise<unknown>) as any,
});

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const auth = useAuth();
  const [presence, setPresence] = useState<Presence>({} as Presence);

  useEffect(() => {

    // Subscription to presence updates
    let presenceSub: (() => void) | null = null;
    async function subscribeToPresence(id: string) {
      // Subscribe to presence updates
      const route = `/presence/${id}`;
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
            setPresence({} as Presence)
          }
        }
      });
    }

    // Fetch this user's presence information
    // If it doesn't exist yet, create it
    async function fetchPresence(id: string): Promise<Presence | null> {
      // Check if presence doc exists
      const getResponse = await APIHttp.GET<PresenceSchema, Presence>(`/presence/${id}`);
      // If account exists return the doc
      if (getResponse.success && getResponse.data) {
        return getResponse.data[0];
      } else {
        // Else Create doc
        const postResponse = await APIHttp.POST<PresenceSchema, Presence>('/presence/create', {
          userId: id,
          status: 'online',
          roomId: '',
          boardId: '',
          cursor: { x: 0, y: 0, z: 0 },
          viewport: {
            position: { x: 0, y: 0, z: 0 },
            size: { width: 0, height: 0, depth: 0 },
          }
        });
        if (postResponse.success && postResponse.data) {
          return postResponse.data[0];
        } else {
          return null;
        }
      }
    }

    // Get/Create presence doc and subscribe to updates
    async function setup() {
      // If authenticated then fetch presence state
      if (auth.auth) {
        const presence = await fetchPresence(auth.auth.id);
        if (presence) {
          setPresence(presence);
          subscribeToPresence(auth.auth.id);
        }
      }
    }

    // Setup this presence provider
    setup();

    // Clean up. 
    return () => {
      // Unsub from presence updates.
      if (presenceSub) {
        presenceSub();
      }
    }
  }, [auth])

  /**
   * Update presence state
   * @param id The id of the presence doc to update
   * @param updates The updates to apply to the presence doc
   * @returns 
   */
  async function update(id: string, updates: Partial<PresenceSchema>) {
    const res = await APIHttp.PUT<PresenceSchema>(`/presence/${id}`, updates);
    return res;
  }

  return (
    <PresenceContext.Provider value={{ presence, update }}>
      {props.children}
    </PresenceContext.Provider>
  );
}
