/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Hot keys react hook based on NPM 'hotkeys-js' module
 */

import React, { useCallback, useRef, useEffect } from 'react';
import hotkeys, { HotkeysEvent, KeyHandler } from 'hotkeys-js';

export type { HotkeysEvent } from 'hotkeys-js';

export type HotkeysOptions = {
  scope?: string;
  element?: HTMLElement;
  keyup?: boolean;
  keydown?: boolean;
  splitKey?: string;
  dependencies?: any[];
};

/**
 * Hook for using key shortcuts
 *
 * @export
 * @template T
 * @param {string} keys
 * @param {KeyHandler} callback
 * @returns {(React.MutableRefObject<T | null>)}
 */
export function useHotkeys<T extends Element>(
  keys: string,
  callback: KeyHandler,
  options?: HotkeysOptions
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const dep = options?.dependencies;
  delete options?.dependencies;

  // The return value of this callback determines if the browsers default behavior is prevented.
  const memoisedCallback = useCallback(
    (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent) => {
      if (ref.current === null || document.activeElement === ref.current) {
        callback(keyboardEvent, hotkeysEvent);
        return true;
      }
      return false;
    },
    [ref, dep]
  );

  useEffect(() => {
    const opt = options ? options : {};
    hotkeys(keys, opt, memoisedCallback);

    return () => hotkeys.unbind(keys, memoisedCallback);
  }, [memoisedCallback, keys, dep]);

  return ref;
}
