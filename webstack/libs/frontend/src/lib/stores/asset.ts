/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
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
import { Asset } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket
import { APIHttp, SocketAPI } from '../api';

interface AssetState {
  assets: Asset[];
  error: string | null;
  update: (roomId: string) => void;
  clearError: () => void;
  subscribe: (roomId: string) => Promise<void>;
  unsubscribe: () => void;
}

/**
 * The AssetStore.
 */

const AssetStore = create<AssetState>()((set, get) => {
  let assetSub: (() => void) | null = null;
  return {
    assets: [],
    error: null,
    clearError: () => {
      set({ error: null });
    },
    unsubscribe: () => {
      // Unsubscribe old subscription
      if (assetSub) {
        assetSub();
        assetSub = null;
      }
    },
    update: async (roomId: string) => {
      if (!SAGE3Ability.canCurrentUser('read', 'assets')) return;
      // Refresh the collection from the server with websockets
      const res = await APIHttp.QUERY<Asset>('/assets', { room: roomId });
      if (res.success) {
        set({ assets: res.data });
      } else {
        set({ error: res.message });
      }
    },
    subscribe: async (roomId: string) => {
      if (!SAGE3Ability.canCurrentUser('read', 'assets')) return;
      const res = await APIHttp.QUERY<Asset>('/assets', { room: roomId });
      if (res.success) {
        set({ assets: res.data });
      } else {
        set({ error: 'Error reading assets' });
        return;
      }

      // Unsubscribe old subscription
      if (assetSub) {
        assetSub();
        assetSub = null;
      }

      // Socket Subscribe Message
      const route = '/assets?room=' + roomId;
      // Socket Listenting to updates from server about the current assets
      assetSub = await SocketAPI.subscribe<Asset>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Asset[];
            set({ assets: [...get().assets, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Asset[];
            const assets = [...get().assets];
            docs.forEach((doc) => {
              const idx = assets.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                assets[idx] = doc;
              }
            });
            set({ assets });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Asset[];
            const ids = docs.map((d) => d._id);
            const assets = [...get().assets];
            const remainingAssets = assets.filter((a) => !ids.includes(a._id));
            set({ assets: remainingAssets });
          }
        }
      });
      return Promise.resolve();
    },
  };
});

// Export the Zustand store
export const useAssetStore = AssetStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AssetStore', useAssetStore);
