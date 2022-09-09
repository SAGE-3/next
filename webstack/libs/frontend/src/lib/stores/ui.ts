/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The React version of Zustand
import create from 'zustand';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

// Zoom limits, from 30% to 400%
const MinZoom = 0.3;
const MaxZoom = 4.0;
// Zoom step of 10%
const StepZoom = 0.1;
// When using mouse wheel, repeated events
const WheelStepZoom = 0.008;

// Typescript interface defining the store
interface UIState {
  scale: number;
  boardWidth: number;
  boardHeight: number;
  gridSize: number;
  zIndex: number;
  showUI: boolean;
  boardPosition: { x: number; y: number };
  selectedAppId: string;

  // Panels & Context Menu
  menuPanelPosition: { x: number; y: number };
  setMenuPanelPosition: (pos: { x: number; y: number }) => void;
  appPanelPosition: { x: number; y: number };
  setAppPanelPosition: (pos: { x: number; y: number }) => void;
  appToolbarPanelPosition: { x: number; y: number };
  setAppToolbarPosition: (pos: { x: number; y: number }) => void;
  minimapPanelPosition: { x: number; y: number };
  setminimapPanelPosition: (pos: { x: number; y: number }) => void;
  assetsPanelPosition: { x: number; y: number };
  setassetsPanelPosition: (pos: { x: number; y: number }) => void;
  infoPanelPosition: { x: number; y: number };
  setInfoPanelPosition: (position: { x: number; y: number }) => void;
  contextMenuPosition: { x: number; y: number };
  setContextMenuPosition: (pos: { x: number; y: number }) => void;

  setBoardPosition: (pos: { x: number; y: number }) => void;
  setGridSize: (gridSize: number) => void;
  setSelectedApp: (appId: string) => void;
  flipUI: () => void;
  displayUI: () => void;
  hideUI: () => void;
  incZ: () => void;
  resetZIndex: () => void;
  setScale: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomInDelta: (d: number, cursor?: { x: number; y: number }) => void;
  zoomOutDelta: (d: number, cursor?: { x: number; y: number }) => void;
}

/**
 * The UIStore.
 */
export const useUIStore = create<UIState>((set, get) => ({
  scale: 1.0,
  boardWidth: 3840,
  boardHeight: 2160,
  gridSize: 1,
  zIndex: 1,
  showUI: true,
  selectedAppId: '',
  boardPosition: { x: 0, y: 0 },
  menuPanelPosition: { x: 20, y: 130 },
  appPanelPosition: { x: 20, y: 325 },
  appToolbarPanelPosition: { x: 20, y: 850 },
  minimapPanelPosition: { x: 20, y: 690 },
  assetsPanelPosition: { x: 250, y: 20 },
  infoPanelPosition: { x: 20, y: 20 },
  contextMenuPosition: { x: 0, y: 0 },
  setInfoPanelPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, infoPanelPosition: pos })),
  setContextMenuPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, contextMenuPosition: pos })),
  setminimapPanelPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, minimapPanelPosition: pos })),
  setassetsPanelPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, assetsPanelPosition: pos })),
  setAppToolbarPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, appToolbarPanelPosition: pos })),
  setAppPanelPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, appPanelPosition: pos })),
  setMenuPanelPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, menuPanelPosition: pos })),
  setBoardPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, boardPosition: pos })),
  setGridSize: (size: number) => set((state) => ({ ...state, gridSize: size })),
  setSelectedApp: (appId: string) => set((state) => ({ ...state, selectedAppId: appId })),
  flipUI: () => set((state) => ({ ...state, showUI: !state.showUI })),
  displayUI: () => set((state) => ({ ...state, showUI: true })),
  hideUI: () => set((state) => ({ ...state, showUI: false })),
  incZ: () => set((state) => ({ ...state, zIndex: state.zIndex + 1 })),
  resetZIndex: () => set((state) => ({ ...state, zIndex: 1 })),
  setScale: (z: number) => set((state) => ({ ...state, scale: z })),
  zoomIn: () => set((state) => ({ ...state, scale: state.scale * (1 + StepZoom) })),
  zoomOut: () => set((state) => ({ ...state, scale: state.scale / (1 + StepZoom) })),
  zoomInDelta: (d, cursor) =>
    set((state) => {
      const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
      const zoomInVal = Math.min(get().scale + step * get().scale, MaxZoom);
      if (cursor) {
        const b = get().boardPosition;
        const s = get().scale;
        const x1 = b.x - cursor.x / s;
        const y1 = b.y - cursor.y / s;
        const x2 = b.x - cursor.x / zoomInVal;
        const y2 = b.y - cursor.y / zoomInVal;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const newX = b.x - dx;
        const newY = b.y - dy;
        return { ...state, boardPosition: { x: newX, y: newY }, scale: zoomInVal };
      } else {
        return { ...state, scale: zoomInVal };
      }
    }),
  zoomOutDelta: (d, cursor) =>
    set((state) => {
      const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
      const zoomOutVal = Math.max(get().scale - step * get().scale, MinZoom);
      if (cursor) {
        const b = get().boardPosition;
        const s = get().scale;
        const x1 = b.x - cursor.x / s;
        const y1 = b.y - cursor.y / s;
        const x2 = b.x - cursor.x / zoomOutVal;
        const y2 = b.y - cursor.y / zoomOutVal;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const newX = b.x - dx;
        const newY = b.y - dy;
        return { ...state, boardPosition: { x: newX, y: newY }, scale: zoomOutVal };
      } else {
        return { ...state, scale: zoomOutVal };
      }
    }),
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('UIStore', useUIStore);
