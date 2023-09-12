/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { App } from '@sage3/applications/schema';
import { throttle } from 'throttle-debounce';
import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores';

/**
 * Throttle hook for the apps store to reduce the amount of updates to react
 * @param delay Delay to the amount of updates from the apps store
 * @returns
 */
export function useThrottleApps(delay: number) {
  const [apps, setApps] = useState(useAppStore.getState().apps);
  const updateAppsThrottle = throttle(delay, (apps: App[]) => {
    setApps(apps);
  });
  // Keep the reference
  const updateAppsRef = useCallback(updateAppsThrottle, []);
  // Connect to the store on mount, disconnect on unmount, catch state-changes in a reference
  useEffect(
    () =>
      useAppStore.subscribe((state) => {
        updateAppsRef(state.apps);
      }),
    []
  );

  return apps;
}
