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
import { Message, MessageSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket
import { APIHttp, SocketAPI } from '../api';

interface MessageState {
  messages: Message[];
  interval: number | null;
  lastone: Message | null;
  error: string | null;
  clearError: () => void;
  create: (newMsg: MessageSchema) => Promise<void>;
  delete: (id: string) => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => void;
}

/**
 * The MessageStore.
 */
const MessageStore = create<MessageState>()((set, get) => {
  let msgSub: (() => void) | null = null;
  return {
    messages: [],
    interval: null,
    lastone: null,
    error: null,
    clearError: () => {
      set({ error: null });
    },
    create: async (newMsg: MessageSchema) => {
      if (!SAGE3Ability.canCurrentUser('create', 'message')) return;
      const res = await SocketAPI.sendRESTMessage(`/message/`, 'POST', newMsg);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    delete: async (id: string) => {
      if (!SAGE3Ability.canCurrentUser('delete', 'message')) return;
      const res = await SocketAPI.sendRESTMessage(`/message/${id}`, 'DELETE');
      if (!res.success) {
        set({ error: res.message });
      }
    },
    unsubscribe: () => {
      // Unsubscribe old subscription
      if (msgSub) {
        msgSub();
        msgSub = null;
        const interval = get().interval;
        if (interval) window.clearInterval(interval);
      }
    },
    subscribe: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'message')) return;
      set({ ...get(), messages: [] });

      const msg = await APIHttp.GET<Message>('/message');
      if (msg.success) {
        set({ messages: msg.data });
      } else {
        set({ error: msg.message });
        return;
      }

      const interval = window.setInterval(async () => {
        const now = new Date();
        const msgs = get().messages;
        const newMsgs = msgs.filter((m) => {
          const diff = now.getTime() - m._createdAt;
          return diff < 30 * 1000;
        });
        const last = get().lastone;
        if (last) {
          const diff = now.getTime() - last._createdAt;
          if (diff > 5 * 1000) {
            set({ lastone: null });
          }
        }
        set({ messages: newMsgs });
      }, 5 * 1000);
      set({ interval: interval });

      // Unsubscribe old subscription
      if (msgSub) {
        msgSub();
        msgSub = null;
        if (interval) window.clearInterval(interval);
      }

      // Socket Subscribe Message
      const route = '/message';
      // Socket Listenting to updates from server
      msgSub = await SocketAPI.subscribe<Message>(route, (message) => {
        // console.log('Got message:', message.doc[0].data);
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Message[];
            set({ messages: [...get().messages, ...docs], lastone: docs[0] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Message[];
            const messages = [...get().messages];
            docs.forEach((doc) => {
              const idx = messages.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                messages[idx] = doc;
              }
            });
            set({ messages });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Message[];
            const ids = docs.map((d) => d._id);
            const messages = [...get().messages];
            const remainingMessages = messages.filter((a) => !ids.includes(a._id));
            set({ messages: remainingMessages });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const useMessageStore = MessageStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('MessageStore', useMessageStore);
