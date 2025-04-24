/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
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
import { Link, LinkSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket
import { APIHttp, SocketAPI } from '../api';

interface LinkStoreState {
  links: Link[];
  error: string | null;
  create: (link: LinkSchema) => Promise<void>;
  clearError: () => void;
  subscribe: (boardId: string) => Promise<void>;
  unsubscribe: () => void;

  // Linker interaction to link two apps
  linkedAppId: string;
  cacheLinkedAppId: (appId: string) => string;
  clearLinkAppId: () => void;

  // Add Link
  addLink: (
    sourceId: string,
    targetId: string,
    boardId: string,
    linkType: LinkSchema['type'],
    meta?: LinkSchema['metadata']
  ) => Promise<void>;
}

/**
 * The linkstore.
 */

const LinkStore = create<LinkStoreState>()((set, get) => {
  let linkSub: (() => void) | null = null;
  return {
    links: [],
    error: null,
    clearError: () => {
      set({ error: null });
    },
    create: async (newLink: LinkSchema) => {
      if (!SAGE3Ability.canCurrentUser('create', 'apps')) return;
      const link = await SocketAPI.sendRESTMessage('/links', 'POST', newLink);
      if (!link.success) {
        set({ error: link.message });
      }
      return link;
    },
    unsubscribe: () => {
      // Unsubscribe old subscription
      if (linkSub) {
        linkSub();
        linkSub = null;
      }
    },
    subscribe: async (boardId: string) => {
      if (!SAGE3Ability.canCurrentUser('read', 'links')) return;
      const res = await APIHttp.QUERY<Link>('/links', { boardId: boardId });
      console.log('LinkStore: subscribe', res);
      if (res.success) {
        set({ links: res.data });
      } else {
        set({ error: 'Error reading links' });
        return;
      }

      // Unsubscribe old subscription
      if (linkSub) {
        linkSub();
        linkSub = null;
      }

      // Socket Subscribe Message
      const route = '/links?boardId=' + boardId;
      // Socket Listenting to updates from server about the current links
      linkSub = await SocketAPI.subscribe<Link>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Link[];
            set({ links: [...get().links, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Link[];
            const links = [...get().links];
            docs.forEach((doc) => {
              const idx = links.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                links[idx] = doc;
              }
            });
            set({ links });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Link[];
            const ids = docs.map((d) => d._id);
            const links = [...get().links];
            const remaininglinks = links.filter((a) => !ids.includes(a._id));
            set({ links: remaininglinks });
          }
        }
      });
      return Promise.resolve();
    },
    // Linker interaction to link two apps
    linkedAppId: '',
    cacheLinkedAppId: (appId: string) => {
      const cachedLinkAppid = get().linkedAppId;
      set((state) => {
        // IF the appId is the same as the cached one, return the state
        if (state.linkedAppId === appId) {
          return state;
        }
        // IF the appId is different, set the new one
        if (cachedLinkAppid) {
          return {
            ...state,
            linkedAppId: '',
          };
        } else {
          return {
            ...state,
            linkedAppId: appId,
          };
        }
      });

      return cachedLinkAppid;
    },
    clearLinkAppId: () => set((state) => ({ ...state, linkedAppId: '' })),

    // Adding Logic
    addLink: async (
      sourceAppId: string,
      targetAppId: string,
      boardId: string,
      linkType: LinkSchema['type'],
      meta?: LinkSchema['metadata']
    ) => {
      const newLink = {
        sourceAppId,
        targetAppId,
        boardId,
        type: linkType,
        metadata: meta,
      } as LinkSchema;
      const res = await get().create(newLink);
      console.log('Link created', res);
    },
  };
});

// Export the Zustand store
export const useLinkStore = LinkStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('LinkStore', useLinkStore);
