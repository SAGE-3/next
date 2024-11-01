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

import { App } from '@sage3/applications/schema';
import { SAGEColors } from '@sage3/shared';
import { Position, Size } from '@sage3/shared/types';
import { useAppStore } from './app';

// Zoom limits, from 2% to 300%
export const MinZoom = 0.1;
export const MaxZoom = 6;
// When using mouse wheel, repeated events
export const WheelStepZoom = 0.008;

// type DrawingMode = 'none' | 'pen' | 'eraser';

interface UIState {
  scale: number;
  boardWidth: number;
  boardHeight: number;
  zIndex: number;

  boardPosition: { x: number; y: number };
  selectedAppId: string;
  boardLocked: boolean; // Lock the board that restricts dragging and zooming
  boardDragging: boolean; // Is the user dragging the board?
  appDragging: boolean; // Is the user dragging an app?
  roomlistShowFavorites: boolean;

  setroomlistShowFavorites: (show: boolean) => void;

  // The user's local viewport.
  viewport: { position: Omit<Position, 'z'>; size: Omit<Size, 'depth'> };
  setViewport: (position: Omit<Position, 'z'>, size: Omit<Size, 'depth'>) => void;

  // Selected Apps
  selectedAppsIds: string[];
  selectedAppsSnapshot: { [id: string]: Position };
  setSelectedAppsIds: (appId: string[]) => void;
  setSelectedAppSnapshot: (apps: { [id: string]: Position }) => void;
  addSelectedApp: (appId: string) => void;
  removeSelectedApp: (appId: string) => void;
  clearSelectedApps: () => void;

  savedSelectedAppsIds: string[];
  setSavedSelectedAppsIds: () => void;
  clearSavedSelectedAppsIds: () => void;

  //Tags
  selectedTag: string;
  setSelectedTag: (value: string) => void;

  // whiteboard
  clearMarkers: boolean;
  clearAllMarkers: boolean;
  undoLastMarker: boolean;
  markerColor: SAGEColors;
  markerSize: number;
  markerOpacity: number;
  setMarkerColor: (color: SAGEColors) => void;
  setClearMarkers: (clear: boolean) => void;
  setUndoLastMarker: (undo: boolean) => void;
  setClearAllMarkers: (clear: boolean) => void;
  setMarkerSize: (size: number) => void;
  setMarkerOpacity: (opacity: number) => void;

  // lasso
  lassoMode: boolean; // marker mode enabled
  clearLassos: boolean;
  clearAllLassos: boolean;
  lassoColor: SAGEColors;
  setLassoColor: (color: SAGEColors) => void;
  setLassoMode: (enable: boolean) => void;
  setClearLassos: (clear: boolean) => void;
  setClearAllLassos: (clear: boolean) => void;

  appToolbarPanelPosition: { x: number; y: number };
  setAppToolbarPosition: (pos: { x: number; y: number }) => void;
  contextMenuPosition: { x: number; y: number };
  setContextMenuPosition: (pos: { x: number; y: number }) => void;

  // RndSafety: to fix appWindows from disappearing
  rndSafeForAction: boolean;
  setRndSafeForAction: (isSafe: boolean) => void;

  // Position Syncronization Information
  boardSynced: boolean; // informs when the local position & scale (in Background Layer) is out of sync with useUIStore position & scale (This)
  setBoardSynced: (synced: boolean) => void;

  setBoardPosition: (pos: { x: number; y: number }) => void;
  resetBoardPosition: () => void;
  setBoardDragging: (dragging: boolean) => void;
  setAppDragging: (dragging: boolean) => void;
  setSelectedApp: (appId: string) => void;
  incZ: () => void;
  resetZIndex: () => void;
  setScale: (z: number) => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomInDelta: (d: number, cursor?: { x: number; y: number }) => void;
  zoomOutDelta: (d: number, cursor?: { x: number; y: number }) => void;
  fitAppsById: (appId: string[]) => void;
  fitApps: (apps: App[]) => void;
  fitAllApps: () => void;
  fitArea: (x: number, y: number, w: number, h: number) => void;
  lockBoard: (lock: boolean) => void;

  deltaLocalMove: {
    [appId: string]: { x: number; y: number };
  };
  setDeltaLocalMove: (delta: { x: number; y: number }, appIds: string[]) => void;
}

/**
 * The UIStore.
 */
export const useUIStore = create<UIState>()((set, get) => ({
  scale: 1.0,
  boardWidth: 3000000, // Having it set to 5,000,000 caused a bug where you couldn't zoom back out.
  boardHeight: 3000000, // It was like the div scaleing became to large
  selectedBoardId: '',
  zIndex: 1,
  boardDragging: false,
  appDragging: false,
  selectedAppsIds: [],
  selectedAppsSnapshot: {},
  lassoMode: false,
  lassoColor: 'red',
  clearLassos: false,
  clearAllLassos: false,
  markerColor: 'red',
  markerSize: 8,
  markerOpacity: 0.6,
  clearMarkers: false,
  clearAllMarkers: false,
  undoLastMarker: false,
  roomlistShowFavorites: true,
  selectedAppId: '',

  rndSafeForAction: true,
  setRndSafeForAction: (isSafe: boolean) => set((state) => ({ ...state, rndSafeForAction: isSafe })),

  boardSynced: true,
  setBoardSynced: (synced: boolean) => set((state) => ({ ...state, boardSynced: synced })),

  boardPosition: { x: 0, y: 0 },
  appToolbarPanelPosition: { x: 16, y: window.innerHeight - 80 },
  contextMenuPosition: { x: 0, y: 0 },
  viewport: { position: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
  setViewport: (position: Omit<Position, 'z'>, size: Omit<Size, 'depth'>) => set((state) => ({ ...state, viewport: { position, size } })),
  boardLocked: false,
  fitAppsById: (appIds: string[]) => {
    const apps = useAppStore.getState().apps;
    const filteredApps = apps.filter((app) => appIds.includes(app._id));
    if (filteredApps.length > 0) {
      get().fitApps(filteredApps);
    }
  },
  fitApps: (apps: App[]) => {
    if (apps.length <= 0) {
      return;
    }
    let x1 = get().boardWidth;
    let x2 = 0;
    let y1 = get().boardHeight;
    let y2 = 0;
    // Bounding box for all applications
    apps.forEach((a) => {
      const p = a.data.position;
      const s = a.data.size;
      if (p.x < x1) x1 = p.x;
      if (p.x > x2) x2 = p.x;
      if (p.y < y1) y1 = p.y;
      if (p.y > y2) y2 = p.y;

      if (p.x + s.width > x2) x2 = p.x + s.width;
      if (p.y + s.height > y2) y2 = p.y + s.height;
    });
    // Width and height of bounding box
    const w = x2 - x1;
    const h = y2 - y1;
    // Center
    const cx = x1 + w / 2;
    const cy = y1 + h / 2;

    // 75% of the smaller dimension (horizontal or vertical)
    const sw = 0.75 * (window.innerWidth / w);
    const sh = 0.75 * (window.innerHeight / h);
    const sm = Math.min(sw, sh);

    // Offset to center the board...
    const bx = Math.floor(-cx + window.innerWidth / sm / 2);
    const by = Math.floor(-cy + window.innerHeight / sm / 2);
    set((state) => ({
      ...state,
      scale: sm,
      boardPosition: { x: bx, y: by },
    }));
  },
  fitAllApps: () => {
    const apps = useAppStore.getState().apps;
    if (apps.length > 0) {
      get().fitApps(apps);
    } else {
      get().resetBoardPosition();
    }
  },
  fitArea: (x: number, y: number, w: number, h: number) => {
    // Fit the smaller dimension into the browser size
    const sm = Math.min(window.innerWidth / w, window.innerHeight / h);
    const xpos = window.innerWidth / sm / 2 - w / 2;
    const ypos = window.innerHeight / sm / 2 - h / 2;
    set((state) => ({
      ...state,
      scale: sm,
      boardPosition: { x: xpos, y: ypos },
    }));
  },
  setContextMenuPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, contextMenuPosition: pos })),
  setAppToolbarPosition: (pos: { x: number; y: number }) => set((state) => ({ ...state, appToolbarPanelPosition: pos })),

  setBoardDragging: (dragging: boolean) => set((state) => ({ ...state, boardDragging: dragging })),
  setAppDragging: (dragging: boolean) => set((state) => ({ ...state, appDragging: dragging })),
  setSelectedApp: (appId: string) => set((state) => ({ ...state, selectedAppId: appId })),
  incZ: () => set((state) => ({ ...state, zIndex: state.zIndex + 1 })),
  resetZIndex: () => set((state) => ({ ...state, zIndex: 1 })),
  setLassoMode: (enable: boolean) => set((state) => ({ ...state, lassoMode: enable })),
  setClearLassos: (clear: boolean) => set((state) => ({ ...state, clearMarkers: clear })),
  setClearAllLassos: (clear: boolean) => set((state) => ({ ...state, clearAllMarkers: clear })),
  setLassoColor: (color: SAGEColors) => set((state) => ({ ...state, markerColor: color })),
  setroomlistShowFavorites: (show: boolean) => set((state) => ({ ...state, roomlistShowFavorites: show })),

  setSelectedAppsIds: (appIds: string[]) => set((state) => ({ ...state, selectedAppsIds: appIds, savedSelectedAppsIds: appIds })),
  setSelectedAppSnapshot: (snapshot: { [id: string]: Position }) => {
    snapshot = structuredClone(snapshot);
    set((state) => ({ ...state, selectedAppsSnapshot: snapshot }));
  },
  addSelectedApp: (appId: string) => set((state) => ({ ...state, selectedApps: [...state.selectedAppsIds, appId] })),
  removeSelectedApp: (appId: string) =>
    set((state) => {
      const newArray = state.selectedAppsIds;
      const index = state.selectedAppsIds.indexOf(appId);
      newArray.splice(index, 1);
      return { ...state, selectedApps: newArray };
    }),
  clearSelectedApps: () => set((state) => ({ ...state, selectedAppsIds: [] })),

  savedSelectedAppsIds: [],
  setSavedSelectedAppsIds: () => set((state) => ({ ...state, savedSelectedAppsIds: get().selectedAppsIds })),
  clearSavedSelectedAppsIds: () => set((state) => ({ ...state, savedSelectedAppsIds: [] })),

  setClearMarkers: (clear: boolean) => set((state) => ({ ...state, clearMarkers: clear })),
  setClearAllMarkers: (clear: boolean) => set((state) => ({ ...state, clearAllMarkers: clear })),
  setMarkerColor: (color: SAGEColors) => set((state) => ({ ...state, markerColor: color })),
  setUndoLastMarker: (undo: boolean) => set((state) => ({ ...state, undoLastMarker: undo })),
  setMarkerSize: (size: number) => set((state) => ({ ...state, markerSize: size })),
  setMarkerOpacity: (opacity: number) => set((state) => ({ ...state, markerOpacity: opacity })),
  lockBoard: (lock: boolean) => set((state) => ({ ...state, boardLocked: lock })),
  setBoardPosition: (pos: { x: number; y: number }) => {
    if (!get().boardLocked) set((state) => ({ ...state, boardPosition: pos }));
  },
  resetBoardPosition: () => {
    if (!get().boardLocked)
      set((state) => ({ ...state, scale: 1, boardPosition: { x: -get().boardWidth / 2, y: -get().boardHeight / 2 } }));
  },

  setScale: (z: number) => {
    if (!get().boardLocked) set((state) => ({ ...state, scale: z }));
  },
  resetZoom: () => {
    const zoomVal = 1;
    if (!get().boardLocked) {
      const b = get().boardPosition;
      const s = get().scale;
      const wx = window.innerWidth / 2;
      const wy = window.innerHeight / 2;
      const pos = zoomOnLocationNewPosition(b, { x: wx, y: wy }, s, zoomVal);
      set((state) => ({ ...state, boardPosition: pos, scale: zoomVal }));
    }
  },
  zoomIn: () => {
    const zoomInVal = Math.min(get().scale + 0.02 * get().scale, MaxZoom);
    if (!get().boardLocked) {
      const b = get().boardPosition;
      const s = get().scale;
      const wx = window.innerWidth / 2;
      const wy = window.innerHeight / 2;
      const pos = zoomOnLocationNewPosition(b, { x: wx, y: wy }, s, zoomInVal);
      set((state) => ({ ...state, boardPosition: pos, scale: zoomInVal }));
    }
  },
  zoomOut: () => {
    const zoomOutVal = Math.max(get().scale - 0.02 * get().scale, MinZoom);
    if (!get().boardLocked) {
      const b = get().boardPosition;
      const s = get().scale;
      const wx = window.innerWidth / 2;
      const wy = window.innerHeight / 2;
      const pos = zoomOnLocationNewPosition(b, { x: wx, y: wy }, s, zoomOutVal);

      set((state) => ({ ...state, boardPosition: pos, scale: zoomOutVal }));
    }
  },
  zoomInDelta: (d, cursor) => {
    if (!get().boardLocked)
      set((state) => {
        const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
        const zoomInVal = Math.min(get().scale + step * get().scale, MaxZoom);
        if (cursor) {
          const b = get().boardPosition;
          const s = get().scale;
          const pos = zoomOnLocationNewPosition(b, { x: cursor.x, y: cursor.y }, s, zoomInVal);
          return { ...state, boardPosition: pos, scale: zoomInVal };
        } else {
          // Zoom towards the center of the screen
          const b = get().boardPosition;
          const s = get().scale;
          const wx = window.innerWidth / 2;
          const wy = window.innerHeight / 2;
          const pos = zoomOnLocationNewPosition(b, { x: wx, y: wy }, s, zoomInVal);
          return { ...state, boardPosition: pos, scale: zoomInVal };
        }
      });
  },
  zoomOutDelta: (d, cursor) => {
    if (!get().boardLocked)
      set((state) => {
        const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
        const zoomOutVal = Math.max(get().scale - step * get().scale, MinZoom);
        if (cursor) {
          const b = get().boardPosition;
          const s = get().scale;
          const pos = zoomOnLocationNewPosition(b, { x: cursor.x, y: cursor.y }, s, zoomOutVal);
          return { ...state, boardPosition: pos, scale: zoomOutVal };
        } else {
          const b = get().boardPosition;
          const s = get().scale;
          const wx = window.innerWidth / 2;
          const wy = window.innerHeight / 2;
          const pos = zoomOnLocationNewPosition(b, { x: wx, y: wy }, s, zoomOutVal);
          return { ...state, boardPosition: pos, scale: zoomOutVal };
        }
      });
  },

  selectedTag: '',
  setSelectedTag: (value: string) => set((state) => ({ ...state, selectedTag: value })),
  deltaLocalMove: {},
  setDeltaLocalMove: (delta: { x: number; y: number }, appIds: string[]) => {
    const newLocalMove = {} as { [appId: string]: { x: number; y: number } };
    appIds.forEach((appId) => {
      newLocalMove[appId] = delta;
    });
    set((state) => ({ ...state, deltaLocalMove: newLocalMove }));
  },
}));

/**
 * Used to get the new position of the board when zooming towards a new position.
 * @param fromPosition The position you currently are
 * @param towardsPos Toward what position. (Cursor, center of screen)
 * @param currentZoom (current zoom level)
 * @param newZoom (new zoom level)
 * @returns New Position
 */
function zoomOnLocationNewPosition(
  fromPosition: { x: number; y: number },
  towardsPos: { x: number; y: number },
  currentZoom: number,
  newZoom: number
): { x: number; y: number } {
  const x1 = fromPosition.x - towardsPos.x / currentZoom;
  const y1 = fromPosition.y - towardsPos.y / currentZoom;
  const x2 = fromPosition.x - towardsPos.x / newZoom;
  const y2 = fromPosition.y - towardsPos.y / newZoom;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const x = fromPosition.x - dx;
  const y = fromPosition.y - dy;
  return { x, y };
}

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('UIStore', useUIStore);
