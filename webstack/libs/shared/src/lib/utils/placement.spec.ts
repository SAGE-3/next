/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { findAppPlacement, Rect } from './placement';

// A 2000 x 1000 view whose center is (1000, 500)
const view: Rect = { x: 0, y: 0, width: 2000, height: 1000 };
const size = { width: 400, height: 400 };
const MARGIN = 40;

// Checks every placement must pass
function expectGoodSpot(spot: { x: number; y: number }, apps: Rect[]) {
  const placed = { ...spot, ...size };
  for (const app of apps) {
    const apart =
      placed.x + placed.width + MARGIN <= app.x ||
      app.x + app.width + MARGIN <= placed.x ||
      placed.y + placed.height + MARGIN <= app.y ||
      app.y + app.height + MARGIN <= placed.y;
    expect(apart).toBe(true);
  }
  const w = Math.min(placed.x + placed.width, view.width) - Math.max(placed.x, 0);
  const h = Math.min(placed.y + placed.height, view.height) - Math.max(placed.y, 0);
  expect((w * h) / (placed.width * placed.height)).toBeGreaterThanOrEqual(0.5);
}

describe('findAppPlacement', () => {
  it('centers the app on an empty board', () => {
    expect(findAppPlacement(view, [], size)).toEqual({ x: 800, y: 300 });
  });

  it('centers the app when the center is free', () => {
    const apps = [{ x: 0, y: 0, width: 200, height: 200 }];
    expect(findAppPlacement(view, apps, size)).toEqual({ x: 800, y: 300 });
  });

  it('places the app right next to an app in the center, keeping the margin', () => {
    const apps = [{ x: 800, y: 300, width: 400, height: 400 }];
    const spot = findAppPlacement(view, apps, size);
    expectGoodSpot(spot, apps);
    // Beside it, level with the center: the closest free spot
    expect(spot.y).toBe(300);
    expect([360, 1240]).toContain(spot.x);
  });

  it('finds the gap in a crowded view', () => {
    // A row of apps across the middle, with a gap wide enough on the right
    const apps = [
      { x: 0, y: 250, width: 1100, height: 500 },
      { x: 1600, y: 250, width: 400, height: 500 },
      { x: 0, y: 0, width: 2000, height: 200 },
      { x: 0, y: 800, width: 2000, height: 200 },
    ];
    const spot = findAppPlacement(view, apps, size);
    expectGoodSpot(spot, apps);
    expect(spot.x).toBeGreaterThanOrEqual(1140);
    expect(spot.x + size.width).toBeLessThanOrEqual(1560);
  });

  it('lets the app stick out of the view a little', () => {
    // Everything in view taken but a 400 px strip along the right edge: with the margin,
    // the app has to stick out of the view by 40 px (still 90% in view)
    const apps = [{ x: 0, y: 0, width: 1600, height: 1000 }];
    const spot = findAppPlacement(view, apps, size);
    expectGoodSpot(spot, apps);
    expect(spot.x + size.width).toBeGreaterThan(view.width);
  });

  it('keeps at least half of the app in view', () => {
    // Only a strip along the right edge left: 65% in view is accepted, 40% is not
    const accepted = findAppPlacement(view, [{ x: 0, y: 0, width: 1700, height: 1000 }], size);
    expect(accepted).toEqual({ x: 1740, y: 300 });
    const refused = findAppPlacement(view, [{ x: 0, y: 0, width: 1800, height: 1000 }], size);
    expect(refused).toEqual({ x: 800, y: 300 });
  });

  it('ignores an app covering the whole view, like a backdrop', () => {
    const apps = [{ x: -500, y: -500, width: 3000, height: 2000 }];
    expect(findAppPlacement(view, apps, size)).toEqual({ x: 800, y: 300 });
  });

  it('falls back to the center when there is no room', () => {
    // Tiles covering the view and beyond, with no gap wide enough anywhere
    const apps: Rect[] = [];
    for (let x = -600; x < 2600; x += 250) {
      for (let y = -600; y < 1600; y += 250) apps.push({ x, y, width: 240, height: 240 });
    }
    expect(findAppPlacement(view, apps, size)).toEqual({ x: 800, y: 300 });
  });

  it('centers an app larger than the view', () => {
    const apps = [{ x: 0, y: 0, width: 200, height: 200 }];
    expect(findAppPlacement(view, apps, { width: 3000, height: 2000 })).toEqual({ x: -500, y: -500 });
  });

  it('respects a custom margin', () => {
    const apps = [{ x: 800, y: 300, width: 400, height: 400 }];
    const spot = findAppPlacement(view, apps, size, { margin: 100 });
    expect(spot.y).toBe(300);
    expect([300, 1300]).toContain(spot.x);
  });

  it('places the app around a target point instead of the center', () => {
    // A third of the way down the view
    expect(findAppPlacement(view, [], size, { target: { x: 1000, y: 333 } })).toEqual({ x: 800, y: 133 });
    // Taken: the closest free spot to the target
    const apps = [{ x: 800, y: 133, width: 400, height: 400 }];
    const spot = findAppPlacement(view, apps, size, { target: { x: 1000, y: 333 } });
    expectGoodSpot(spot, apps);
  });

  it('always gives the same answer for the same board', () => {
    const apps = [
      { x: 700, y: 200, width: 600, height: 600 },
      { x: 100, y: 100, width: 300, height: 300 },
    ];
    expect(findAppPlacement(view, apps, size)).toEqual(findAppPlacement(view, [...apps], size));
  });

  it('is quick on a busy board', () => {
    const apps: Rect[] = [];
    for (let i = 0; i < 500; i++) apps.push({ x: (i % 25) * 300 - 3000, y: Math.floor(i / 25) * 300 - 2000, width: 250, height: 250 });
    const start = Date.now();
    findAppPlacement(view, apps, size);
    expect(Date.now() - start).toBeLessThan(200);
  });
});
