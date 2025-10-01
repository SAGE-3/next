/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState } from 'react';
import { useUserSettings, useHotkeys, useUIStore, useKeyPress, useLinkStore } from '@sage3/frontend';

// keywords: interaction hotkeys

export function InteractionbarShortcuts() {
  // Settings
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);
  const clearLinkAppId = useLinkStore((state) => state.clearLinkAppId);

  const [cachedPrimaryActionMode, setCachedPrimaryActionMode] = useState<'lasso' | 'grab' | 'pen' | 'eraser' | 'linker' | 'shape' | 'rectangle' | 'circle' | undefined>(
    undefined
  );
  const spacebarPressed = useKeyPress(' ');

  const handleSpacebarAction = useCallback(() => {
    if (spacebarPressed && !selectedApp) {
      if (primaryActionMode !== 'grab') {
        setCachedPrimaryActionMode(primaryActionMode);
        setPrimaryActionMode('grab');
      }
    } else {
      // The commented out code will cause rendering order issues, do not attempt to use
      // setCachedPrimaryActionMode((prev) => {
      //   if (prev) {
      //     setPrimaryActionMode(prev);
      //     return undefined;
      //   }
      //   return prev;
      // });
      if (cachedPrimaryActionMode) {
        setPrimaryActionMode(cachedPrimaryActionMode);
        setCachedPrimaryActionMode(undefined);
      }
    }
  }, [spacebarPressed, primaryActionMode, cachedPrimaryActionMode, selectedApp]);

  useEffect(() => {
    handleSpacebarAction();
  }, [spacebarPressed]);

  useHotkeys(
    '1',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('lasso');
      clearLinkAppId();
    },
    { dependencies: [] }
  );

  useHotkeys(
    '2',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('grab');
      setSelectedApp('');
      clearLinkAppId();
    },
    { dependencies: [] }
  );

  useHotkeys(
    '3',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('pen');
      setSelectedApp('');
      setSelectedAppsIds([]);
      clearLinkAppId();
    },
    { dependencies: [] }
  );

  useHotkeys(
    '4',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('shape');
      setSelectedApp('');
      setSelectedAppsIds([]);
      clearLinkAppId();
    },
    { dependencies: [] }
  );


  return <></>;
}
