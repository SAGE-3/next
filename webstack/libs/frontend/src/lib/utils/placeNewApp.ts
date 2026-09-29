/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { findAppPlacement, PlacementOptions } from '@sage3/shared';
import { useAppStore, useUIStore } from '../stores';

/**
 * Where to put a new app of the given size on the board on screen: near the center of
 * the view, clear of the other apps, and in the center if there is no room.
 * For apps created from a menu or a command; an app dropped or pasted by the user goes
 * where the user put it.
 *
 * @param size The new app's size, in board pixels
 * @param options Margin, share in view, or a point to place it around (see findAppPlacement)
 * @returns The new app's top-left corner, in board coordinates
 */
export function placeNewApp(size: { width: number; height: number }, options?: PlacementOptions): { x: number; y: number } {
  const { boardPosition, scale } = useUIStore.getState();
  const view = { x: -boardPosition.x, y: -boardPosition.y, width: window.innerWidth / scale, height: window.innerHeight / scale };
  const apps = useAppStore.getState().apps.map((app) => ({ ...app.data.position, ...app.data.size }));
  return findAppPlacement(view, apps, size, options);
}

/**
 * The view's center, in board coordinates: where apps went before placeNewApp
 */
export function viewCenter(): { x: number; y: number } {
  const { boardPosition, scale } = useUIStore.getState();
  return {
    x: Math.floor(-boardPosition.x + window.innerWidth / scale / 2),
    y: Math.floor(-boardPosition.y + window.innerHeight / scale / 2),
  };
}

/**
 * Move new apps, already set up with a position, to a free spot near the center of the
 * view (see placeNewApp). Several apps (a row of files opened together) move as one
 * block, keeping their layout.
 *
 * @param apps The new apps
 * @param options Margin, share in view, or a point to place them around
 * @returns The apps with their new positions
 */
export function placeNewApps<T extends { position: { x: number; y: number }; size: { width: number; height: number } }>(
  apps: T[],
  options?: PlacementOptions,
): T[] {
  if (apps.length === 0) return apps;
  const left = Math.min(...apps.map((app) => app.position.x));
  const top = Math.min(...apps.map((app) => app.position.y));
  const right = Math.max(...apps.map((app) => app.position.x + app.size.width));
  const bottom = Math.max(...apps.map((app) => app.position.y + app.size.height));
  const spot = placeNewApp({ width: right - left, height: bottom - top }, options);
  const dx = spot.x - left;
  const dy = spot.y - top;
  return apps.map((app) => ({ ...app, position: { ...app.position, x: app.position.x + dx, y: app.position.y + dy } }));
}
