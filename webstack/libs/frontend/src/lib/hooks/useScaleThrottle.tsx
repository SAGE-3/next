/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { throttle } from 'throttle-debounce';
import { useState, useCallback, useEffect } from 'react';
import { useUIStore } from '../stores';

/**
 * Throttle hook for the ui store's scale propery to reduce the amount of updates to react
 * @param delay Delay to the amount of updates from the ui store
 * @returns
 */
export function useScaleThrottle(delay: number) {
  const [scale, setScale] = useState(useUIStore.getState().scale);
  const updateScaleThrottle = throttle(250, (apps: number) => {
    setScale(apps);
  });
  // Keep the reference
  const updateScaleRef = useCallback(updateScaleThrottle, []);
  // Connect to the store on mount, disconnect on unmount, catch state-changes in a reference
  useEffect(
    () =>
      useUIStore.subscribe((state) => {
        updateScaleRef(state.scale);
      }),
    []
  );
  return scale;
}
