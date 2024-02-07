/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';
// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

// Application specific schema
import { Insight, InsightSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

import { APIHttp, SocketAPI } from '../api';

interface InsightState {
  insights: Insight[];
  error: string | null;
  clearError: () => void;
  update: (id: string, updates: Partial<InsightSchema>) => void;
  updateBatch: (updates: { id: string; updates: Partial<InsightSchema> }[]) => Promise<void>;
  subscribe: (boardId: string) => Promise<void>;
  unsubscribe: () => void;
}

/**
 * The PresenceStore.
 */
const InsightStore = create<InsightState>()((set, get) => {
  APIHttp.GET<Insight>('/insight').then((response) => {
    if (response.success) {
      set({ insights: response.data });
    }
  });
  let insightSub: (() => void) | null = null;
  return {
    insights: [],
    error: null,
    clearError: () => {
      set({ error: null });
    },
    update: async (id: string, updates: Partial<InsightSchema>) => {
      if (!SAGE3Ability.canCurrentUser('update', 'insight')) return;
      const res = await SocketAPI.sendRESTMessage(`/insight/${id}`, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    updateBatch: async (updates: { id: string; updates: Partial<InsightSchema> }[]) => {
      if (!SAGE3Ability.canCurrentUser('update', 'insight')) return;
      const res = await SocketAPI.sendRESTMessage('/insight', 'PUT', { batch: updates });
      if (!res.success) {
        set({ error: res.message });
      }
    },
    unsubscribe: () => {
      // Unsubscribe old subscription
      if (insightSub) {
        insightSub();
        insightSub = null;
      }
    },
    subscribe: async (boardId: string) => {
      if (!SAGE3Ability.canCurrentUser('read', 'insight')) return;
      set({ insights: [] });
      const reponse = await APIHttp.QUERY<Insight>('/insight', { boardId });
      if (reponse.success) {
        set({ insights: reponse.data });
      } else {
        set({ error: reponse.message });
        return;
      }

      // Unsubscribe old subscription
      if (insightSub) {
        insightSub();
        insightSub = null;
      }

      // Socket Subscribe Message
      const route = `/insight?boardId=${boardId}`;
      insightSub = await SocketAPI.subscribe<Insight>(route, (message) => {
        if (message.col !== 'INSIGHT') return;
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Insight[];
            set({ insights: [...get().insights, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Insight[];
            const ins = [...get().insights];
            docs.forEach((doc) => {
              const idx = ins.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                ins[idx] = doc;
              }
            });
            set({ insights: ins });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Insight[];
            const ids = docs.map((d) => d._id);
            const ins = [...get().insights];
            const remaining = ins.filter((a) => !ids.includes(a._id));
            set({ insights: remaining });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const useInsightStore = InsightStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('InsightStore', useInsightStore);
