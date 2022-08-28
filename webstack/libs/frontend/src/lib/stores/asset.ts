/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The JS version of Zustand
import createVanilla from 'zustand/vanilla';

// The React Version of Zustand
import createReact from 'zustand';

// Application specific schema
import { Asset, AssetSchema } from '@sage3/shared/types';

// The observable websocket
import { AssetHTTPService, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

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
      assetSub = await SocketAPI.subscribe<AssetSchema>(route, (message) => {
        const doc = message.doc as Asset;
        switch (message.type) {
          case 'CREATE': {
            set({ assets: [...get().assets, doc] });
            break;
          }
          case 'UPDATE': {
            const files = [...get().assets];
            const idx = files.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              files[idx] = doc;
            }
            set({ assets: files });
            break;
          }
          case 'DELETE': {
            const files = [...get().assets];
            const idx = files.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              files.splice(idx, 1);
            }
            set({ assets: files });
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
