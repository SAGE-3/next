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
import { SocketAPI } from '../api';
import { useAuth } from './useAuth';

const PresenceContext = createContext({
  presence: {} as Presence,
  update: (async (updates: Partial<PresenceSchema>) => Promise<unknown>) as any,
});

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const { auth } = useAuth();
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
            setPresence(doc);
            break;
          }
          case 'UPDATE': {
            setPresence(doc);
            break;
          }
          case 'DELETE': {
            setPresence({} as Presence);
          }
        }
      });
    }

    // If the user is authenticated now, subscribe to his presence updates.
    if (auth) {
      subscribeToPresence(auth.id);
    }

    // Clean up.
    return () => {
      // Unsub from presence updates.
      if (presenceSub) {
        presenceSub();
      }
    };
  }, [auth]);

  /**
   * Update presence state
   * @param id The id of the presence doc to update
   * @param updates The updates to apply to the presence doc
   * @returns
   */
  async function update(updates: Partial<PresenceSchema>) {
    if (!auth) return;
    const res = await SocketAPI.sendRESTMessage(`/presence/${auth.id}`, 'PUT', updates);
    return res;
  }

  return <PresenceContext.Provider value={{ presence, update }}>{props.children}</PresenceContext.Provider>;
}
