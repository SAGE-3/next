/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import create from 'zustand';

export const useStore = create((set) => ({
  drawer: {} as { [key: string]: boolean },
  setDrawer: (id: string, drawer: boolean) => set((state: any) => ({ drawer: { ...state.drawer, ...{ [id]: drawer } } })),
}));
