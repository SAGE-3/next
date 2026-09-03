/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState } from 'react';

import { useUIStore } from '../../../stores';
import { useHotkeys } from '../../../hooks';
import ContextMenuHandler from './ContextMenuHandler';

type RadialContextMenuProps = {
  // Only open when the event target is one of these element ids
  divIds: string[];
  // Render prop: gets the press position and a close callback
  children: (ctx: { position: { x: number; y: number }; onClose: () => void }) => JSX.Element;
};

/**
 * Opens a radial menu on right click (or touch long press) over one of the given div ids.
 * Keeps the shared UI store in sync (contextMenuOpen / contextMenuPosition) so that the
 * rest of the UI can react to the menu being open.
 *
 * @param props divIds children
 * @returns JSX.Element | null
 */
export function RadialContextMenu(props: RadialContextMenuProps) {
  // Local visibility, mirrored into the UI store
  const [showMenu, setShowMenu] = useState(false);

  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);
  const setContextMenuPosition = useUIStore((state) => state.setContextMenuPosition);
  const contextMenuOpen = useUIStore((state) => state.contextMenuOpen);
  const setContextMenuOpen = useUIStore((state) => state.setContextMenuOpen);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
    setContextMenuOpen(false);
  }, [setContextMenuOpen]);

  const openMenu = useCallback(
    (x: number, y: number) => {
      setContextMenuPosition({ x, y });
      setContextMenuOpen(true);
      setShowMenu(true);
    },
    [setContextMenuPosition, setContextMenuOpen]
  );

  // Someone else (a menu action, the store) closed the menu
  useEffect(() => {
    if (!contextMenuOpen && showMenu) setShowMenu(false);
  }, [contextMenuOpen, showMenu]);

  useHotkeys('esc', () => closeMenu());

  // Right click
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      // Always suppress the browser menu while on the board, not just over the
      // background: the div ids only decide whether the radial menu opens.
      event.preventDefault();
      const target = event.target as HTMLElement | null;
      if (target && props.divIds.includes(target.id)) {
        openMenu(event.clientX, event.clientY);
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [props.divIds, openMenu]);

  // Touch long press
  useEffect(() => {
    const ctx = new ContextMenuHandler((type: string, event: any) => {
      if (type !== 'contextmenu') return;
      const target = event.target as HTMLElement | null;
      if (!target || !props.divIds.includes(target.id)) return;
      const touch = event.touches?.[0] ?? event.changedTouches?.[0];
      if (touch) openMenu(touch.clientX, touch.clientY);
    });

    document.addEventListener('touchstart', ctx.onTouchStart, { passive: true });
    document.addEventListener('touchmove', ctx.onTouchMove, { passive: true });
    document.addEventListener('touchend', ctx.onTouchEnd);
    document.addEventListener('touchcancel', ctx.onTouchCancel);

    return () => {
      document.removeEventListener('touchstart', ctx.onTouchStart);
      document.removeEventListener('touchmove', ctx.onTouchMove);
      document.removeEventListener('touchend', ctx.onTouchEnd);
      document.removeEventListener('touchcancel', ctx.onTouchCancel);
    };
  }, [props.divIds, openMenu]);

  return showMenu ? props.children({ position: contextMenuPosition, onClose: closeMenu }) : null;
}
