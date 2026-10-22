/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Finding a spot on the board for a new app: close to the center of the view, not on
 * top of other apps, and with some space around it.
 */

// A rectangle on the board, in board coordinates
export type Rect = { x: number; y: number; width: number; height: number };

export type PlacementOptions = {
  // Free space kept between the new app and the other apps, in board pixels
  margin?: number;
  // Share of the new app's area that must be inside the view (it may stick out, up to half)
  minVisible?: number;
  // Point to place the app around, in board coordinates (default: the center of the view)
  target?: { x: number; y: number };
};

const DEFAULT_MARGIN = 40;
const DEFAULT_MIN_VISIBLE = 0.5;
// Most rings of the outward search around the center, whatever the app's size
const MAX_RINGS = 40;

// Do two rectangles overlap (touching edges don't count)
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

// Does rectangle a contain rectangle b entirely
function contains(a: Rect, b: Rect): boolean {
  return a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;
}

// Share of rectangle a's area that is inside rectangle b
function visibleShare(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (a.width * a.height);
}

/**
 * Find where to put a new app: the free spot closest to the center of the view (or the
 * target point), keeping `margin` around it and with at least half of it (`minVisible`)
 * inside the view. If there is no such spot, the app goes in the center of the view (or
 * on the target), as before.
 * The result depends only on the arguments, so every client computes the same spot.
 *
 * @param view The visible part of the board, in board coordinates
 * @param apps The apps on the board (position and size)
 * @param size The new app's size
 * @param options Margin and share in view
 * @returns The new app's top-left corner, in board coordinates
 */
export function findAppPlacement(
  view: Rect,
  apps: Rect[],
  size: { width: number; height: number },
  options: PlacementOptions = {},
): { x: number; y: number } {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const minVisible = options.minVisible ?? DEFAULT_MIN_VISIBLE;
  const { width, height } = size;
  const centerX = options.target?.x ?? view.x + view.width / 2;
  const centerY = options.target?.y ?? view.y + view.height / 2;
  const centered = { x: Math.round(centerX - width / 2), y: Math.round(centerY - height / 2) };
  if (width <= 0 || height <= 0) return centered;

  // Only spots at least half in view can win: the apps around the view are enough, grown by the
  // margin so that a spot clear of them keeps that space. An app covering the whole view
  // (a map or large image used as a backdrop) is ignored, or nothing would ever fit.
  const reach: Rect = { x: view.x - width, y: view.y - height, width: view.width + 2 * width, height: view.height + 2 * height };
  const obstacles = apps
    .filter((app) => !contains(app, view))
    .map((app) => ({ x: app.x - margin, y: app.y - margin, width: app.width + 2 * margin, height: app.height + 2 * margin }))
    .filter((app) => overlaps(app, reach));

  const isFree = (x: number, y: number) => {
    const spot = { x, y, width, height };
    return visibleShare(spot, view) >= minVisible && !obstacles.some((o) => overlaps(spot, o));
  };

  // Candidate top-left corners, the center first
  const candidates: { x: number; y: number }[] = [centered];
  // Next to each app: just outside each of its sides, lined up with its edges, centered
  // on it, or level with the view's center
  for (const o of obstacles) {
    const xs = [o.x, o.x + o.width - width, o.x + (o.width - width) / 2, centered.x];
    const ys = [o.y, o.y + o.height - height, o.y + (o.height - height) / 2, centered.y];
    for (const y of ys) candidates.push({ x: o.x - width, y }, { x: o.x + o.width, y });
    for (const x of xs) candidates.push({ x, y: o.y - height }, { x, y: o.y + o.height });
  }
  // Rings of positions around the center, to find the gaps the list above misses
  const radius = Math.max(view.width, view.height) / 2;
  const step = Math.max(Math.min(width, height) / 4, radius / MAX_RINGS, 10);
  for (let ring = 1; ring * step <= radius; ring++) {
    const d = ring * step;
    for (let k = -ring; k <= ring; k++) {
      const t = k * step;
      candidates.push(
        { x: centered.x + t, y: centered.y - d },
        { x: centered.x + t, y: centered.y + d },
        { x: centered.x - d, y: centered.y + t },
        { x: centered.x + d, y: centered.y + t },
      );
    }
  }

  // The free candidate closest to the center (the first one found on a tie)
  let best: { x: number; y: number } | undefined;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    const distance = Math.hypot(x + width / 2 - centerX, y + height / 2 - centerY);
    if (distance < bestDistance && isFree(x, y)) {
      best = { x, y };
      bestDistance = distance;
    }
  }
  return best ?? centered;
}
