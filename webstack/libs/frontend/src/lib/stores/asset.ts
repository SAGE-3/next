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
import { AssetHTTPService, SocketAPI } from '../api';

interface AssetState {
  assets: Asset[];
  error: string | null;
  update: () => void;
  clearError: () => void;
  subscribe: () => Promise<void>;
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
    update: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'assets')) return;
      // Refresh the collection from the server with websockets
      const res = await SocketAPI.sendRESTMessage('/assets', 'GET');
      if (res.success) {
        set({ assets: res.data });
      } else {
        set({ error: res.message });
      }
    },
    subscribe: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'assets')) return;
      const files = await AssetHTTPService.readAll();
      if (files) {
        set({ assets: files });
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
      const route = '/assets';
      // Socket Listenting to updates from server about the current assets
      assetSub = await SocketAPI.subscribe<Asset>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            console.log('AssetStore> CREATE new #', message.doc.length);
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
    },
  };
});

// Export the Zustand store
export const useAssetStore = AssetStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AssetStore', useAssetStore);
