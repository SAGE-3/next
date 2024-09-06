/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef } from 'react';

// SAGE Imports
import { useUIStore } from '@sage3/frontend';

// Fix to handle disappearing apps during scaling/zooming events
// Tried to put this inside of UI store, but didn't seem to work....

// If the bug occurs during re-rendering, it may be ideal to have a delayed start to 
// allow for drag inside the app window, granted it wont scale well with lots of applications,
// but it guarantees all cases are caught
export const RndSafety = () => {
  const boardSynced = useUIStore((state) => state.boardSynced)
  const setRndSafeToAction = useUIStore((state) => state.setRndSafeToAction)

  const rndSafeToActionTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setRndSafeToAction(false)

    if (boardSynced) {
      if (rndSafeToActionTimeoutRef.current !== null) {
        window.clearTimeout(rndSafeToActionTimeoutRef.current);
      }

      rndSafeToActionTimeoutRef.current = window.setTimeout(() => {
        setRndSafeToAction(true)
      }, 100);
    }
  }, [boardSynced])


  return (
    <></>
  );
};
