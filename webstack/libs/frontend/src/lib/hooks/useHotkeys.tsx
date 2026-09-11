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

import React, { useRef, useEffect, useLayoutEffect } from 'react';
import hotkeys, { HotkeysEvent, KeyHandler } from 'hotkeys-js';

export type { HotkeysEvent } from 'hotkeys-js';

export type HotkeysOptions = {
  scope?: string;
  element?: HTMLElement;
  keyup?: boolean;
  keydown?: boolean;
  splitKey?: string;
  // Retained for existing callers; callbacks always use the latest committed render.
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
  options?: HotkeysOptions,
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(callback);
  const { scope, element, keyup, keydown, splitKey } = options ?? {};

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // Keep the binding stable while allowing the callback to read current state.
    // The return value determines if the browser's default behavior is prevented.
    const handler = (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent) => {
      if (ref.current === null || document.activeElement === ref.current) {
        callbackRef.current(keyboardEvent, hotkeysEvent);
        return true;
      }
      return false;
    };
    hotkeys(keys, { scope, element, keyup, keydown, splitKey }, handler);

    // The typed unbind overload uses '+' as its separator and otherwise defaults to the active scope.
    const unbindKeys = splitKey ? keys.split(splitKey).join('+') : keys;
    return () => hotkeys.unbind(unbindKeys, scope || 'all', handler);
  }, [keys, scope, element, keyup, keydown, splitKey]);

  return ref;
}
