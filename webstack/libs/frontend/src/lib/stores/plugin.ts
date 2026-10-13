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

type PluginActivation =
  | { readonly enabled: false }
  | {
      readonly enabled: true;
      readonly packageDigest: string;
      readonly autoApprove: boolean;
    };

interface PluginState {
  plugins: Plugin[];
  error: string | null;
  fetched: boolean;

  upload: (
    file: File,
    username: string,
    roomId: string,
  ) => Promise<{
    success: boolean;
    message: string;
    status?: number;
  }>;
  subscribeToPlugins: () => Promise<void>;
  setEnabled: (
    pluginId: string,
    boardId: string,
    activation: PluginActivation,
  ) => Promise<{
    success: boolean;
    message?: string;
  }>;
  delete: (id: string) => Promise<void>;
}

async function pluginResponse(response: Response): Promise<{
  success: boolean;
  message: string;
  status: number;
}> {
  const body: unknown = await response.json();

  if (!body || typeof body !== 'object' || !('success' in body) || typeof body.success !== 'boolean') {
    return {
      success: false,
      message: 'Invalid response from the plugin service.',
      status: response.status,
    };
  }

  const success = response.ok && body.success;
  const defaultMessage = success ? 'Plugin updated.' : `Plugin request failed (${response.status}).`;
  const message = 'message' in body && typeof body.message === 'string' ? body.message : defaultMessage;

  return { success, message, status: response.status };
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
    // Enabling is reachable only from the approval dialog, which passes the reviewed digest.
    setEnabled: async (pluginId, boardId, activation) => {
      try {
        const response = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/boards/${encodeURIComponent(boardId)}/activation`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activation),
        });

        return await pluginResponse(response);
      } catch {
        return {
          success: false,
          message: 'Unable to change plugin activation. Please try again.',
        };
      }
    },

    upload: async (file: File, username: string, roomId: string) => {
      if (!SAGE3Ability.canCurrentUser('create', 'plugins')) {
        return {
          success: false,
          message: 'You do not have permission to upload plugins.',
          status: 403,
        };
      }

      // Uploaded with a Form object
      const formData = new FormData();
      formData.append('plugin', file);
      formData.append('username', username);

      if (roomId) {
        formData.append('roomId', roomId);
      }

      try {
        const response = await fetch(apiUrls.plugins.upload, {
        method: 'POST',
          credentials: 'include',
          body: formData,
      });

        return await pluginResponse(response);
      } catch {
        return {
          success: false,
          message: 'Unable to upload the plugin. Please try again.',
        };
      }
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
