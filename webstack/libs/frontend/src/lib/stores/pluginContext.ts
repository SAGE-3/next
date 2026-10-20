import { create } from 'zustand';
import type { PluginContext } from '@sage3/sageplugin';

export type PluginDocumentContext = NonNullable<PluginContext['document']>;

interface PluginContextState {
  readonly boardId: string | null;
  readonly appOrder: readonly string[];
  readonly setAppOrder: (boardId: string | null, appOrder: readonly string[]) => void;
  readonly documents: readonly { readonly appId: string; readonly document: PluginDocumentContext }[];
  readonly setDocument: (appId: string, document: PluginDocumentContext) => void;
  readonly removeDocument: (appId: string) => void;
}

// Browser-local passage selection is never persisted into shared app state.
export const usePluginContextStore = create<PluginContextState>()((set) => ({
  boardId: null,
  appOrder: [],
  setAppOrder: (boardId, appOrder) => set({ boardId, appOrder }),

  documents: [],

  setDocument: (appId, document) =>
    set((state) => ({
      documents: [...state.documents.filter((entry) => entry.appId !== appId), { appId, document }],
    })),

  removeDocument: (appId) =>
    set((state) => ({
      documents: state.documents.filter((entry) => entry.appId !== appId),
    })),
}));
