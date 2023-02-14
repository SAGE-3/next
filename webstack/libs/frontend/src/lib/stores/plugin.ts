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
import { Plugin, PluginSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface PluginState {
  plugins: Plugin[];
  error: string | null;
  fetched: boolean;
  upload: (file: File, description: string) => Promise<{ success: boolean; message: string }>;
  subscribeToPlugins: () => Promise<void>;
  delete: (id: string) => Promise<void>;
}

/**
 * The PluginStore.
 */
const PluginStore = createVanilla<PluginState>((set, get) => {
  let pluginSub: (() => void) | null = null;
  return {
    plugins: [],
    error: null,
    fetched: false,
    clearError: () => {
      set({ error: null });
    },
    delete: async (id: string) => {
      const res = await APIHttp.DELETE('/plugins/remove/' + id);
    },
    upload: async (file: File, description: string) => {
      // Uploaded with a Form object
      const fd = new FormData();
      fd.append('plugin', file);
      fd.append('description', description);
      const res = await fetch('/api/plugins/upload', {
        method: 'POST',
        body: fd,
      });
      const resJson = await res.json();
      return resJson;
    },
    subscribeToPlugins: async () => {
      set({ ...get(), plugins: [], fetched: false });

      const plugins = await APIHttp.GET<PluginSchema, Plugin>('/plugins');
      if (plugins.success) {
        set({ plugins: plugins.data, fetched: true });
      } else {
        set({ error: plugins.message });
        return;
      }
      // Unsubscribe old subscription
      if (pluginSub) {
        pluginSub();
        pluginSub = null;
      }

      // Socket Subscribe Message
      const route = '/plugins';
      // Socket Listenting to updates from server about the current rooms
      pluginSub = await SocketAPI.subscribe<PluginSchema>(route, (message) => {
        const doc = message.doc as Plugin;
        switch (message.type) {
          case 'CREATE': {
            set({ plugins: [...get().plugins, doc] });
            break;
          }
          case 'UPDATE': {
            const rooms = [...get().plugins];
            const idx = rooms.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              rooms[idx] = doc;
            }
            set({ plugins: rooms });
            break;
          }
          case 'DELETE': {
            const plugins = [...get().plugins];
            const idx = plugins.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              plugins.splice(idx, 1);
            }
            set({ plugins: plugins });
          }
        }
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const usePluginStore = createReact(PluginStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PluginStore', usePluginStore);
