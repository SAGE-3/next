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

export enum StuckTypes {
  Controller, // 0
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

// Typescript interface defining the store
interface PanelUI {
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
  opened: boolean; // whether the actions are open (otherwise, just title)
  setOpened: (opened: boolean) => void;
  show: boolean; // whether the panel is visible
  setShow: (show: boolean) => void;
  stuck: StuckTypes; // if the panel is stuck, says direction, otherwise, None or Controller
  setStuck: (show: StuckTypes) => void;
}

interface UIState {
  scale: number;
  boardWidth: number;
  boardHeight: number;
  gridSize: number;
  zIndex: number;
  showUI: boolean;
  boardPosition: { x: number; y: number };
  selectedAppId: string;
  boardDragging: boolean; // Is the user dragging the board?
  appDragging: boolean; // Is the user dragging an app?

  // Panels & Context Menu
  mainMenu: PanelUI;
  applicationsMenu: PanelUI;
  navigationMenu: PanelUI;
  avatarMenu: PanelUI;
  controller: PanelUI;
  assetsMenu: PanelUI;

  appToolbarPanelPosition: { x: number; y: number };
  setAppToolbarPosition: (pos: { x: number; y: number }) => void;
  contextMenuPosition: { x: number; y: number };
  setContextMenuPosition: (pos: { x: number; y: number }) => void;

  setBoardPosition: (pos: { x: number; y: number }) => void;
  setBoardDragging: (dragging: boolean) => void;
  setAppDragging: (dragging: boolean) => void;
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
  boardDragging: false,
  appDragging: false,
  selectedAppId: '',
  boardPosition: { x: 0, y: 0 },
  appToolbarPanelPosition: { x: 16, y: window.innerHeight - 80 },
  contextMenuPosition: { x: 0, y: 0 },

  controller: {
    position: { x: 16, y: window.innerHeight - 350 },
    stuck: StuckTypes.None,
    setPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, controller: { ...state.controller, position: pos } })),
    setStuck: (stuck: StuckTypes) => set((state) => ({ ...state, controller: { ...state.controller, stuck: stuck } })),
    setOpened: (opened: boolean) => set((state) => ({ ...state, controller: { ...state.controller, opened: opened } })),
    opened: true,
    setShow: (show: boolean) => set((state) => ({ ...state, controller: { ...state.controller, show: show } })),
    show: true,
  },
  assetsMenu: {
    position: { x: 220, y: 130 },
    stuck: StuckTypes.Controller,
    setPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, assetsMenu: { ...state.assetsMenu, position: pos } })),
    setStuck: (stuck: StuckTypes) => set((state) => ({ ...state, assetsMenu: { ...state.assetsMenu, stuck: stuck } })),
    setOpened: (opened: boolean) => set((state) => ({ ...state, assetsMenu: { ...state.assetsMenu, opened: opened } })),
    opened: true,
    setShow: (show: boolean) => set((state) => ({ ...state, assetsMenu: { ...state.assetsMenu, show: show } })),
    show: false,
  },
  mainMenu: {
    position: { x: 20, y: 130 },
    stuck: StuckTypes.Controller,
    setPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, mainMenu: { ...state.mainMenu, position: pos } })),
    setStuck: (stuck: StuckTypes) => set((state) => ({ ...state, mainMenu: { ...state.mainMenu, stuck: stuck } })),
    setOpened: (opened: boolean) => set((state) => ({ ...state, mainMenu: { ...state.mainMenu, opened: opened } })),
    opened: true,
    setShow: (show: boolean) => set((state) => ({ ...state, mainMenu: { ...state.mainMenu, show: show } })),
    show: false,
  },
  applicationsMenu: {
    position: { x: 20, y: 325 },
    stuck: StuckTypes.Controller,
    setPosition: (pos: { x: number; y: number }) =>
      set((state) => ({ ...state, applicationsMenu: { ...state.applicationsMenu, position: pos } })),
    setStuck: (stuck: StuckTypes) => set((state) => ({ ...state, applicationsMenu: { ...state.applicationsMenu, stuck: stuck } })),
    opened: true,
    setOpened: (op: boolean) => set((state) => ({ ...state, applicationsMenu: { ...state.applicationsMenu, opened: op } })),
    show: false,
    setShow: (show: boolean) => set((state) => ({ ...state, applicationsMenu: { ...state.applicationsMenu, show: show } })),
  },
  navigationMenu: {
    position: { x: 20, y: 690 },
    stuck: StuckTypes.Controller,
    setPosition: (pos: { x: number; y: number }) =>
      set((state) => ({ ...state, navigationMenu: { ...state.navigationMenu, position: pos } })),
    setStuck: (stuck: StuckTypes) => set((state) => ({ ...state, navigationMenu: { ...state.navigationMenu, stuck: stuck } })),
    setOpened: (opened: boolean) => set((state) => ({ ...state, navigationMenu: { ...state.navigationMenu, opened: opened } })),
    opened: true,
    setShow: (show: boolean) => set((state) => ({ ...state, navigationMenu: { ...state.navigationMenu, show: show } })),
    show: false,
  },
  avatarMenu: {
    position: { x: 20, y: 20 },
    stuck: StuckTypes.Controller,
    setPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, avatarMenu: { ...state.avatarMenu, position: pos } })),
    setStuck: (stuck: StuckTypes) => set((state) => ({ ...state, avatarMenu: { ...state.avatarMenu, stuck: stuck } })),
    setOpened: (opened: boolean) => set((state) => ({ ...state, avatarMenu: { ...state.avatarMenu, opened: opened } })),
    opened: true,
    setShow: (show: boolean) => set((state) => ({ ...state, avatarMenu: { ...state.avatarMenu, show: show } })),
    show: false,
  },
  setContextMenuPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, contextMenuPosition: pos })),
  setAppToolbarPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, appToolbarPanelPosition: pos })),
  setBoardPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, boardPosition: pos })),
  setBoardDragging: (dragging: boolean) => set((state) => ({ ...state, boardDragging: dragging })),
  setAppDragging: (dragging: boolean) => set((state) => ({ ...state, appDragging: dragging })),
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
