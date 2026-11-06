/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: each person's own pan and zoom. A screen point is (p - (x, y)) * zoom.
 * The view is kept in the browser per app, so it is the same when you come back.
 */

import { useCallback, useEffect } from 'react';

import { Box, Point } from '../model/geometry';
import { View, useDrawingStore } from './store';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
const DEFAULT_VIEW: View = { x: 0, y: 0, zoom: 1 };
const storageKey = (appId: string) => 'sage3-drawing-view:' + appId;

export const toDrawing = (view: View, screen: Point): Point => ({ x: screen.x / view.zoom + view.x, y: screen.y / view.zoom + view.y });

/** Zoom by factor, keeping the drawing point under `screen` in place */
export function zoomAt(view: View, factor: number, screen: Point): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
  const p = toDrawing(view, screen);
  return { zoom, x: p.x - screen.x / zoom, y: p.y - screen.y / zoom };
}

// Fit zooms in at most this far, so a single small shape does not fill the whole window
export const FIT_MAX_ZOOM = 4;

/**
 * A view showing the whole box as large as possible (zooming in or out, up to FIT_MAX_ZOOM),
 * centred in the part of the viewport not covered by the controls (`insets`, in screen pixels).
 */
export function fitView(
  box: Box,
  viewport: { w: number; h: number },
  margin = 24,
  insets: { left: number; top: number } = { left: 0, top: 0 },
): View {
  const areaW = Math.max(viewport.w - insets.left - margin * 2, 1);
  const areaH = Math.max(viewport.h - insets.top - margin * 2, 1);
  const zoom = Math.max(MIN_ZOOM, Math.min(FIT_MAX_ZOOM, areaW / Math.max(box.w, 1), areaH / Math.max(box.h, 1)));
  // Centre of the free area, in screen pixels
  const cx = insets.left + margin + areaW / 2;
  const cy = insets.top + margin + areaH / 2;
  return { zoom, x: box.x + box.w / 2 - cx / zoom, y: box.y + box.h / 2 - cy / zoom };
}

function loadView(appId: string): View {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey(appId)) ?? 'null');
    if (v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.zoom === 'number') return v;
  } catch {
    // No storage (private window, blocked site data): use the default view
  }
  return DEFAULT_VIEW;
}

/** The app's view, from the shared store, loaded from and saved to the browser's storage */
export function useView(appId: string): { view: View; setView: (v: View) => void } {
  const view = useDrawingStore((s) => s.views[appId]) ?? DEFAULT_VIEW;
  const storeSetView = useDrawingStore((s) => s.setView);

  useEffect(() => {
    storeSetView(appId, loadView(appId));
  }, [appId]);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(appId), JSON.stringify(view));
      } catch {
        // Not saved: the view resets next time
      }
    }, 500);
    return () => clearTimeout(id);
  }, [appId, view.x, view.y, view.zoom]);

  const setView = useCallback((v: View) => storeSetView(appId, v), [appId, storeSetView]);
  return { view, setView };
}
