/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { state as AppState } from './index';

type SageNode = AppState['nodes'][number];
type SageDimension = AppState['dimensions'][number];

// ─── Luminate colour palette (31 colours) ────────────────────────────────────

export const COLORS: string[] = [
  '#FF6E67', '#6AB2FF', '#48D6C1', '#FFC37A', '#C67BF2',
  '#2ECC71', '#6A7485', '#ADDF71', '#FFA054', '#6AB2FF',
  '#FFC37A', '#BB72E6', '#FF9350', '#6A7485', '#68DB8E',
  '#A45CCF', '#FF9350', '#BB72E6', '#6AB2FF', '#FFC37A',
  '#BB72E6', '#FF9350', '#FF7451', '#FF6E67', '#6AB2FF',
  '#48D6C1', '#FFC37A', '#C67BF2', '#6A7485', '#4DCFB1',
  '#FFA054',
];

// ─── Colour math ─────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt((hex.charAt(0) === '#' ? hex.slice(1) : hex), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function avgRgb(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

// ─── Node colour ─────────────────────────────────────────────────────────────

export function nodeColorHex(
  node: SageNode,
  xDim: SageDimension | null,
  yDim: SageDimension | null
): string {
  if (!xDim) return '#aaaaaa';

  const getIdx = (dim: SageDimension) => {
    const val =
      dim.type === 'categorical'
        ? node.Dimension.categorical[dim.name]
        : node.Dimension.ordinal[dim.name];
    return Math.max(0, dim.values.indexOf(val));
  };

  const xIdx = getIdx(xDim);
  const xRgb = hexToRgb(COLORS[xIdx % COLORS.length]);

  if (!yDim) return rgbToHex(...xRgb);

  const yIdx = getIdx(yDim);
  const yRgb = hexToRgb(COLORS[(xDim.values.length + yIdx) % COLORS.length]);
  const avg = avgRgb(xRgb, yRgb);
  return rgbToHex(...avg);
}

// ─── D3 cluster target ───────────────────────────────────────────────────────

export function dimensionClusterTarget(
  axis: 'x' | 'y',
  dim: SageDimension | null,
  node: SageNode,
  size: number
): number {
  if (!dim) return 0;
  const val =
    dim.type === 'categorical'
      ? node.Dimension.categorical[dim.name]
      : node.Dimension.ordinal[dim.name];
  const idx = dim.values.indexOf(val);
  const n = dim.values.length + 1;
  // Ordinal on Y: reverse so higher values sit higher on screen
  const effectiveIdx = dim.type === 'ordinal' && axis === 'y' ? dim.values.length - idx : idx;
  return effectiveIdx * (size / n) - size / 2 + 0.1 * size;
}
