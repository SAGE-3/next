/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * This code was adapted from the npm library 'react-use'
 * to add a debounced resize functionality
 */

import { useState, useRef, useLayoutEffect, useMemo } from 'react';

type UseMeasureOptions = {
  timeout?: number;
};

type UseMeasureFields = 'x' | 'y' | 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height';

type UseMeasureRect = Pick<DOMRectReadOnly, UseMeasureFields>;

const defaultState: UseMeasureRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

export function useMeasure<E extends Element = Element>(
  options: UseMeasureOptions = { timeout: 0 }
): [(element: E) => void, UseMeasureRect] {
  const { timeout } = options;

  const [element, ref] = useState<E | null>(null);
  const [rect, setRect] = useState<UseMeasureRect>(defaultState);
  const resizeTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const observer = useMemo(
    () =>
      new ResizeObserver((entries) => {
        if (entries[0]) {
          const { x, y, width, height, top, left, bottom, right } = entries[0].contentRect;

          if (timeout === 0) {
            setRect({ x, y, width, height, top, left, bottom, right });
          } else {
            if (resizeTimeout.current) {
              clearTimeout(resizeTimeout.current);
            }

            resizeTimeout.current = setTimeout(() => {
              setRect({ x, y, width, height, top, left, bottom, right });
            }, timeout);
          }
        }
      }),
    [timeout]
  );

  useLayoutEffect(() => {
    if (!element) return;
    observer.observe(element);
    return () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }

      observer.disconnect();
    };
  }, [element, observer]);

  return [ref, rect];
}
