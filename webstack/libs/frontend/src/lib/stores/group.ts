/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';
// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface AGroupState {
  name: string;
  color: string;
  apps: string[];
}
interface GroupsState {
  groups: AGroupState[];
  add: (name: string, color: string, apps: string[]) => void;
}

/**
 * The BoardStore.
 */
const GroupsStore = create<GroupsState>()((set, get) => {
  return {
    groups: [],
    add: (name: string, color: string, apps: string[]) => {
      set({ groups: [...get().groups, { name, color, apps }] });
    },
  };
});

// Export the Zustand store
export const useGroupsStore = GroupsStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('GroupsStore', useGroupsStore);
