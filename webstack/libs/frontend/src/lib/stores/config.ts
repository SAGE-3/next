/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

import { OpenConfiguration } from '@sage3/shared/types';
import { GetConfiguration } from '../config/config';

interface ConfigState {
  config: OpenConfiguration;
}

/**
 * The Config store
 */
export const useConfigStore = create<ConfigState>()((set, get) => {
  // get the confguration from the server and set it
  GetConfiguration().then((data) => {
    set({ config: data as OpenConfiguration });
  });
  // return the state of the store
  return {
    config: {} as OpenConfiguration,
  };
});

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('ConfigStore', useConfigStore);
