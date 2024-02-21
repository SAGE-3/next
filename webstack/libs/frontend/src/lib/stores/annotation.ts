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
import { SocketAPI } from '../api';

interface AnnotationState {
  annotations: Annotation[];
  error: string | null;
  fetched: boolean;
  clearError: () => void;
  update: (id: string, updates: Partial<AnnotationSchema>) => void;
}

/**
 * The BoardStore.
 */
const AnnotationStore = create<AnnotationState>()((set, get) => {
  return {
    annotations: [],
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
  };
});

// Export the Zustand store
export const useAnnotationStore = AnnotationStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AnnotationStore', useAnnotationStore);
