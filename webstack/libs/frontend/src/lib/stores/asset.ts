/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// The JS version of Zustand
import createVanilla from 'zustand/vanilla';

// The React Version of Zustand
import createReact from 'zustand';

// Application specific schema
import { Asset } from '@sage3/shared/types';

// The observable websocket
import { AssetHTTPService, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';
import { SAGE3Ability } from '@sage3/shared';

interface AssetState {
  assets: Asset[];
  error: string | null;
  clearError: () => void;
  subscribe: () => Promise<void>;
  unsubscribe: () => void;
}

/**
 * The AssetStore.
 */
const AssetStore = createVanilla<AssetState>((set, get) => {
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

// Convert the Zustand JS store to Zustand React Store
export const useAssetStore = createReact(AssetStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AssetStore', useAssetStore);
