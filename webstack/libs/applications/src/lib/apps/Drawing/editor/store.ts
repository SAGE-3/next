/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: local editor state, per app id, shared by the canvas and the SAGE3 toolbar.
 * Nothing here is synchronized: each person has their own tool, selection and style.
 */

import { create } from 'zustand';

import { ColorName, Fill, Head, Shapes, Size } from '../model/shape';
import { DrawingDoc } from '../model/doc';

export type Tool = 'select' | 'pan' | 'pen' | 'rect' | 'roundrect' | 'ellipse' | 'diamond' | 'line' | 'arrow' | 'text';
export type Style = { stroke: ColorName; fill: Fill; size: Size; heads: { start: Head; end: Head } };
export type View = { x: number; y: number; zoom: number };
export type Editor = { tool: Tool; selection: string[]; style: Style; editingId: string | null };

export const DEFAULT_STYLE: Style = { stroke: 'black', fill: 'none', size: 'M', heads: { start: 'none', end: 'arrow' } };
const DEFAULT_EDITOR: Editor = { tool: 'select', selection: [], style: DEFAULT_STYLE, editingId: null };

interface DrawingStore {
  editors: Record<string, Editor>;
  docs: Record<string, DrawingDoc>;
  // Size of each app's canvas in screen pixels, so the toolbar can fit the drawing
  viewports: Record<string, { w: number; h: number }>;
  views: Record<string, View>;
  // Current shapes of each app, kept by the canvas, so the toolbar does not re-read the document
  shapes: Record<string, Shapes>;
  get: (appId: string) => Editor;
  setTool: (appId: string, tool: Tool) => void;
  setSelection: (appId: string, selection: string[]) => void;
  setStyle: (appId: string, style: Partial<Style>) => void;
  setEditing: (appId: string, editingId: string | null) => void;
  setDoc: (appId: string, doc: DrawingDoc | null) => void;
  setViewport: (appId: string, size: { w: number; h: number }) => void;
  setView: (appId: string, view: View) => void;
  setShapes: (appId: string, shapes: Shapes) => void;
}

export const useDrawingStore = create<DrawingStore>()((set, get) => {
  const patch = (appId: string, p: Partial<Editor>) =>
    set((s) => ({ editors: { ...s.editors, [appId]: { ...(s.editors[appId] ?? DEFAULT_EDITOR), ...p } } }));
  return {
    editors: {},
    docs: {},
    viewports: {},
    views: {},
    shapes: {},
    get: (appId) => get().editors[appId] ?? DEFAULT_EDITOR,
    setTool: (appId, tool) => patch(appId, { tool }),
    setSelection: (appId, selection) => {
      // Skip identical selections: each change is also broadcast to the other users
      const current = (get().editors[appId] ?? DEFAULT_EDITOR).selection;
      if (current.length === selection.length && current.every((id, i) => id === selection[i])) return;
      patch(appId, { selection });
    },
    setStyle: (appId, style) => patch(appId, { style: { ...(get().editors[appId] ?? DEFAULT_EDITOR).style, ...style } }),
    setEditing: (appId, editingId) => patch(appId, { editingId }),
    setDoc: (appId, doc) =>
      set((s) => {
        const docs = { ...s.docs };
        if (doc) docs[appId] = doc;
        else delete docs[appId];
        return { docs };
      }),
    setViewport: (appId, size) => set((s) => ({ viewports: { ...s.viewports, [appId]: size } })),
    setView: (appId, view) => set((s) => ({ views: { ...s.views, [appId]: view } })),
    setShapes: (appId, shapes) => set((s) => ({ shapes: { ...s.shapes, [appId]: shapes } })),
  };
});

/** The editor state of one app, re-rendering only when it changes */
export const useEditor = (appId: string): Editor => useDrawingStore((s) => s.editors[appId] ?? DEFAULT_EDITOR);
