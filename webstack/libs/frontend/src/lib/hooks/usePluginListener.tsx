/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppSchema } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import { useEffect } from 'react';

/**
 * Listens for updates from plugin
 */
export function usePluginListener() {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  // Use effecto attach a window message listener to listen to updates
  useEffect(() => {
    function pluginMessageProcess(event: any) {
      // Is this message from the s3plugin?
      if (event.data.source !== 's3plugin') return;
      // Format message
      const message = event.data as { source: string; type: 'update'; state: Partial<AppSchema>; id: string };
      // If this is an update
      if (message.type === 'update') {
        // Consolidated the Plugin update into one.
        // The SAGE3 app store seperates updates to the App and the AppState.
        // If the message has 'state' on it, then lets update both
        if (Object.keys(message.state).includes('state')) {
          const stateUpdate = structuredClone(message.state.state);
          const appUpdate = structuredClone(message.state);
          delete appUpdate.state;
          if (Object.keys(appUpdate).length > 0) update(message.id, appUpdate);
          if (Object.keys(stateUpdate).length > 0) updateState(message.id, stateUpdate);
        } else {
          const appUpdate = structuredClone(message.state);
          delete appUpdate.state;
          if (Object.keys(appUpdate).length > 0) update(message.id, appUpdate);
        }
      }
    }

    // Mount listener
    window.addEventListener('message', pluginMessageProcess);
    // Unmount listener
    return () => window.removeEventListener('message', pluginMessageProcess);
  }, []);

  return null;
}
