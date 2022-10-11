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
import { Message, MessageSchema } from '@sage3/shared/types';

// The observable websocket
import { APIHttp, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface MessageState {
  messages: Message[];
  lastone: Message | null;
  error: string | null;
  clearError: () => void;
  create: (newMsg: MessageSchema) => Promise<void>;
  delete: (id: string) => Promise<void>;
  subscribe: () => Promise<void>;
}

/**
 * The MessageStore.
 */
const MessageStore = createVanilla<MessageState>((set, get) => {
  let msgSub: (() => void) | null = null;
  return {
    messages: [],
    lastone: null,
    error: null,
    clearError: () => {
      set({ error: null });
    },
    create: async (newMsg: MessageSchema) => {
      const res = await SocketAPI.sendRESTMessage(`/message/`, 'POST', newMsg);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    delete: async (id: string) => {
      const res = await SocketAPI.sendRESTMessage(`/message/${id}`, 'DELETE');
      if (!res.success) {
        set({ error: res.message });
      }
    },
    subscribe: async () => {
      set({ ...get(), messages: [] });

      const msg = await APIHttp.GET<MessageSchema, Message>('/message');
      if (msg.success) {
        set({ messages: msg.data });
      } else {
        set({ error: msg.message });
        return;
      }
      // Unsubscribe old subscription
      if (msgSub) {
        msgSub();
        msgSub = null;
      }

      // Socket Subscribe Message
      const route = '/message';
      // Socket Listenting to updates from server
      msgSub = await SocketAPI.subscribe<MessageSchema>(route, (message) => {
        const doc = message.doc as Message;
        switch (message.type) {
          case 'CREATE': {
            set({ messages: [...get().messages, doc], lastone: doc });
            break;
          }
          case 'UPDATE': {
            const msg = [...get().messages];
            const idx = msg.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              msg[idx] = doc;
            }
            set({ messages: msg });
            break;
          }
          case 'DELETE': {
            const msg = [...get().messages];
            const idx = msg.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              msg.splice(idx, 1);
            }
            set({ messages: msg });
          }
        }
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const useMessageStore = createReact(MessageStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('MessageStore', useMessageStore);
