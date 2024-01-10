/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

//
// Adapted from https://github.com/alex-cory/react-useportal
//

import { useRef, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';


export type UsePortalOptions = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Portal hook component
 */
export function usePortal(props: UsePortalOptions) {
  const closeOnOutsideClick = true;
  const closeOnEsc = true;

  // This is the element you are clicking to trigger opening the portal
  const targetEl = useRef<HTMLElement>();
  const portal = useRef(document.createElement('div'));

  useEffect(() => {
    if (!portal.current) portal.current = document.createElement('div')
  }, [portal])

  const handleKeydown = useCallback((e: KeyboardEvent): void =>
    (e.key === 'Escape' && closeOnEsc) ? props.onClose() : undefined,
    [closeOnEsc, props.onClose]
  );

  const handleOutsideMouseClick = useCallback((e: MouseEvent) => {
    const containsTarget = (target: HTMLElement) => target.contains(e.target as Node);
    // There might not be a targetEl if the portal was opened programmatically.
    if (containsTarget(portal.current) || (e as any).button !== 0 || !props.isOpen || (targetEl.current && containsTarget(targetEl.current))) return;
    if (closeOnOutsideClick) props.onClose();
  }, [props.onClose, closeOnOutsideClick, portal]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!portal.current) return;
    handleOutsideMouseClick(e);
  }, [handleOutsideMouseClick])

  useEffect(() => {
    if (!portal.current) return;

    const node = portal.current;
    document.body.appendChild(portal.current)
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.body.removeChild(node);
    }
  }, [handleOutsideMouseClick, handleKeydown, portal]);

  const Portal = useCallback(({ children }: { children: ReactNode }) => {
    if (portal.current != null) return createPortal(children, portal.current);
    return null;
  }, [portal]);

  return {
    Portal,
    ref: targetEl,
    portalRef: portal,
  };
}
