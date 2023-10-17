/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';

export interface CellStore {
  drawer: { [key: string]: boolean };
  setDrawer: (id: string, drawer: boolean) => void;
}

export const useStore = create<CellStore>()((set) => ({
  drawer: {},
  setDrawer: (id: string, drawer: boolean) => set((state) => ({ drawer: { ...state.drawer, ...{ [id]: drawer } } })),
}));
