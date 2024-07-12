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
import { Plugin } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';
import { apiUrls } from '../config';

interface PluginState {
  plugins: Plugin[];
  error: string | null;
  fetched: boolean;
  upload: (file: File, name: string, description: string, username: string) => Promise<{ success: boolean; message: string }>;
  subscribeToPlugins: () => Promise<void>;
  delete: (id: string) => Promise<void>;
}

/**
 * The PluginStore.
 */
const PluginStore = create<PluginState>()((set, get) => {
  let pluginSub: (() => void) | null = null;
  return {
    plugins: [],
    error: null,
    fetched: false,
    clearError: () => {
      set({ error: null });
    },
    delete: async (id: string) => {
      if (!SAGE3Ability.canCurrentUser('delete', 'plugins')) return;
      await APIHttp.DELETE('/plugins/remove/' + id);
    },
    upload: async (file: File, name: string, description: string, username: string) => {
      if (!SAGE3Ability.canCurrentUser('create', 'plugins')) return;
      // Uploaded with a Form object
      const fd = new FormData();
      fd.append('plugin', file);
      fd.append('description', description);
      fd.append('name', name);
      fd.append('username', username);
      const res = await fetch(apiUrls.plugins.upload, {
        method: 'POST',
        body: fd,
      });
      const resJson = await res.json();
      return resJson;
    },
    subscribeToPlugins: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'plugins')) return;
      set({ ...get(), plugins: [], fetched: false });

      const plugins = await APIHttp.GET<Plugin>('/plugins');
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
      pluginSub = await SocketAPI.subscribe<Plugin>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Plugin[];
            set({ plugins: [...get().plugins, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Plugin[];
            const plugins = [...get().plugins];
            docs.forEach((doc) => {
              const idx = plugins.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                plugins[idx] = doc;
              }
            });
            set({ plugins });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Plugin[];
            const ids = docs.map((d) => d._id);
            const plugins = [...get().plugins];
            const remainingPlugins = plugins.filter((a) => !ids.includes(a._id));
            set({ plugins: remainingPlugins });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const usePluginStore = PluginStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PluginStore', usePluginStore);
