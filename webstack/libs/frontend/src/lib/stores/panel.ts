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

export enum StuckTypes {
  None, // 1
  Top, // 2
  Bottom, // 3
  Left, // 4
  Right, // 5
  TopRight, // 6
  TopLeft, // 7
  BottomRight, // 8
  BottomLeft, // 9
}

export type PanelNames = 'assets' | 'applications' | 'users' | 'navigation' | 'controller' | 'annotations' | 'plugins' | 'kernels';

// Typescript interface defining the store
export interface PanelUI {
  position: { x: number; y: number };
  minimized: boolean; // whether the actions are open (otherwise, just title)
  show: boolean; // whether the panel is visible
  stuck: StuckTypes; // if the panel is stuck, says direction, otherwise, None or Controller
  name: PanelNames;
}

interface UIState {
  // Panels
  panels: PanelUI[];
  getPanel: (name: PanelNames) => PanelUI | undefined;
  updatePanel: (name: PanelNames, updates: Partial<PanelUI>) => void;
  bringPanelForward: (panel: PanelNames) => void;
}

/**
 * The UIStore.
 */
export const usePanelStore = create<UIState>()((set, get) => ({
  panels: [
    {
      position: { x: 5, y: 105 },
      name: 'applications',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    {
      position: { x: 5, y: 105 },
      name: 'assets',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    {
      position: { x: 5, y: 105 },
      name: 'navigation',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    {
      position: { x: 5, y: 105 },
      name: 'annotations',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    {
      position: { x: 5, y: 105 },
      name: 'users',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    {
      position: { x: 5, y: 35 },
      name: 'controller',
      stuck: StuckTypes.Left,
      minimized: false,
      show: true,
    },
    {
      position: { x: 5, y: 105 },
      name: 'plugins',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    {
      position: { x: 5, y: 105 },
      name: 'kernels',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
  ],
  getPanel: (name: PanelNames) => get().panels.find((el) => el.name === name),
  updatePanel: (name: PanelNames, updates: Partial<PanelUI>) => {
    const panels = [...get().panels];
    const idx = panels.findIndex((el) => el.name === name);
    if (idx > -1) {
      panels[idx] = { ...panels[idx], ...updates };
    }
    set({ panels: panels });
  },
  bringPanelForward: (name: PanelNames) => {
    const z = get().panels;
    const i = z.findIndex((el) => el.name === name);
    if (i >= 0) {
      const panel = z.splice(i, 1);
      z.push(panel[0]);
      set({ panels: z });
    }
  },
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PanelStore', usePanelStore);
