/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { useEffect } from 'react';

/**
 * Listens for updates from plugin apps
 * @param url the url to send the request to
 * @returns
 */
export function usePluginListener() {
  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    function updateAppState(event: any) {
      const message = event.data as { id: string; type: string; state: any };
      console.log(message);
      if (message.type === 'update') {
        updateState(message.id, message.state);
      }
    }
    window.addEventListener('message', updateAppState);
    return () => window.removeEventListener('message', updateAppState);
  }, []);

  return null;
}
