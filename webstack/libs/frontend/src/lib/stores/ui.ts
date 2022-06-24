/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The React version of Zustand
import create from 'zustand';

// Zoom limits, from 30% to 400%
const MinZoom = 0.3;
const MaxZoom = 4.0;
// Zoom step of 10%
const StepZoom = 0.1;
// When using mouse wheel, repeated events
const WheelStepZoom = 0.004;

// Typescript interface defining the store
interface UIState {
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomInDelta: (d: number) => void;
  zoomOutDelta: (d: number) => void;
}

/**
 * The UIStore.
 */
export const useUIStore = create<UIState>((set) => ({
  scale: 1.0,
  zoomIn: () => set((state) => ({ scale: state.scale * (1 + StepZoom) })),
  zoomOut: () => set((state) => ({ scale: state.scale / (1 + StepZoom) })),
  zoomInDelta: (d) =>
    set((state) => {
      const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
      const zoomInVal = Math.min(state.scale + step * state.scale, MaxZoom);
      // round off to next 10 value
      // zoomInVal = Math.ceil(zoomInVal * 10) / 10;
      return { scale: zoomInVal };
    }),
  zoomOutDelta: (d) =>
    set((state) => {
      const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
      const zoomOutVal = Math.max(state.scale - step * state.scale, MinZoom);
      // zoomOutVal = Math.floor(zoomOutVal * 10) / 10;
      return { scale: zoomOutVal };
    }),
}));
