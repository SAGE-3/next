/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useUserSettings, useHotkeys, useUIStore } from '@sage3/frontend';

export function InteractionbarShortcuts() {
  // Settings
  const { setPrimaryActionMode } = useUserSettings();
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);

  // useHotkeys(
  //   'h',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('grab');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   's',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('lasso');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   'p',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('pen');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   'e',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('eraser');
  //   },
  //   { dependencies: [] }
  // );

  useHotkeys(
    '1',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('grab');
      setSelectedApp('');
    },
    { dependencies: [] }
  );

  useHotkeys(
    '2',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('lasso');
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
    },
    { dependencies: [] }
  );

  useHotkeys(
    '4',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      setPrimaryActionMode('eraser');
      setSelectedApp('');
      setSelectedAppsIds([]);
    },
    { dependencies: [] }
  );

  return <></>;
}
