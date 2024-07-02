/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
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
import { Annotation, AnnotationSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';

interface AnnotationState {
  annotations: Annotation | undefined;
  error: string | null;
  fetched: boolean;
  clearError: () => void;
  update: (id: string, updates: Partial<AnnotationSchema>) => void;
  getAnnotations: () => Annotation | undefined;
  subscribeToBoard: (boardId: string) => Promise<void>;
  unsubscribe: () => void;
}

/**
 * The BoardStore.
 */
const AnnotationStore = create<AnnotationState>()((set, get) => {
  let annotationSub: (() => void) | null = null;
  return {
    annotations: undefined,
    error: null,
    fetched: false,
    clearError: () => {
      set({ error: null });
    },
    update: async (id: string, updates: Partial<AnnotationSchema>) => {
      if (!SAGE3Ability.canCurrentUser('update', 'boards')) return;
      const res = await SocketAPI.sendRESTMessage(`/annotations/${id}`, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    unsubscribe: () => {
      // Unsubscribe old subscription
      if (annotationSub) {
        annotationSub();
        annotationSub = null;
      }
    },
    getAnnotations: () => {
      return get().annotations;
    },
    subscribeToBoard: async (boardId: string) => {
      if (!SAGE3Ability.canCurrentUser('read', 'annotations')) return;
      set({ annotations: undefined, fetched: false });
      const notes = await APIHttp.GET<Annotation>('/annotations/' + boardId);
      if (notes.success) {
        if (notes.data) set({ annotations: notes.data[0], fetched: true });
      } else {
        set({ error: notes.message });
        return;
      }

      // Socket Subscribe Message
      const route = `/annotations/${boardId}`;
      // Socket Listenting to updates from server about the current board
      annotationSub = await SocketAPI.subscribe<Annotation>(route, (message) => {
        if (message.col !== 'ANNOTATIONS') return;
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc;
            set({ annotations: docs[0] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc;
            set({ annotations: docs[0] });
            break;
          }
          case 'DELETE': {
            set({ annotations: undefined, fetched: false });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const useAnnotationStore = AnnotationStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AnnotationStore', useAnnotationStore);
