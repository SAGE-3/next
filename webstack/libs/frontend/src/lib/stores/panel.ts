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
  panels: { [name: string]: PanelUI };
  zOrder: PanelNames[];
  updatePanel: (name: PanelNames, updates: Partial<PanelUI>) => void;
  bringPanelForward: (panel: PanelNames) => void;
}

/**
 * The UIStore.
 */
export const usePanelStore = create<UIState>()((set, get) => ({
  panels: {
    applications: {
      position: { x: 5, y: 105 },
      name: 'applications',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    assets: {
      position: { x: 5, y: 105 },
      name: 'assets',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    navigation: {
      position: { x: 5, y: 105 },
      name: 'navigation',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    annotations: {
      position: { x: 5, y: 105 },
      name: 'annotations',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    users: {
      position: { x: 5, y: 105 },
      name: 'users',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    controller: {
      position: { x: 5, y: 35 },
      name: 'controller',
      stuck: StuckTypes.Left,
      minimized: false,
      show: true,
    },
    plugins: {
      position: { x: 5, y: 105 },
      name: 'plugins',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
    kernels: {
      position: { x: 5, y: 105 },
      name: 'kernels',
      stuck: StuckTypes.None,
      minimized: false,
      show: false,
    },
  },
  zOrder: ['applications', 'assets', 'users', 'navigation', 'controller', 'annotations', 'plugins', 'kernels'],
  updatePanel: (name: PanelNames, updates: Partial<PanelUI>) => {
    const panel = get().panels[name];
    if (panel) {
      set({ panels: { ...get().panels, [name]: { ...panel, ...updates } } });
    }
  },
  bringPanelForward: (name: PanelNames) => {
    const zOrder = get().zOrder;
    const idx = zOrder.findIndex((el) => el === name);
    if (idx > -1) {
      zOrder.splice(idx, 1);
      zOrder.push(name);
    }
    set({ zOrder: zOrder });
  },
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PanelStore', usePanelStore);
