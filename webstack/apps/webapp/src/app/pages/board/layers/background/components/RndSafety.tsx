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

// Mitiage/ Bandaid fix using delays to handle disappearing apps
// Tried to put this inside of UI store, but didn't seem to work....
export const RndSafety = () => {
  const boardSynced = useUIStore((state) => state.boardSynced)
  const setRndSafeToAction = useUIStore((state) => state.setRndSafeToAction)

  const rndSafeToActionTimeoutRef = useRef<NodeJS.Timeout | null>(null) 

  useEffect(() => {
    setRndSafeToAction(false)

    if (boardSynced) {
      if (rndSafeToActionTimeoutRef.current !== null) {
        clearTimeout(rndSafeToActionTimeoutRef.current);
      }

      rndSafeToActionTimeoutRef.current = setTimeout(() => {
        setRndSafeToAction(true)
      }, 100);
    }
  }, [boardSynced])


  return (
    <></>
  );
};
