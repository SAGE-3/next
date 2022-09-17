/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useCallback, useEffect } from 'react';
import { useColorModeValue } from "@chakra-ui/react";

import './style.scss';
import { useUIStore } from '../../../stores';

import ContextMenuHandler from "./ContextMenuHandler";

/**
 * ContextMenu component
 * @param props children divId
 * @returns JSX.Element
 */
export const ContextMenu = (props: { children: JSX.Element; divId: string }) => {
  // Cursor position
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  // Hide menu
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Set the position of the context menu
  const setContextMenuPosition = useUIStore((state) => state.setContextMenuPosition);

  const handleContextMenu = useCallback((event: any) => {
    event.preventDefault();
    // Check if right div ID is clicked
    if (event.target.id === props.divId) {
      // local position plus board position
      setContextMenuPos({ x: event.clientX, y: event.clientY, });
      setContextMenuPosition({ x: event.clientX, y: event.clientY, });
      setTimeout(() => setShowContextMenu(true));
    }
  }, [setContextMenuPos, props.divId, setContextMenuPosition]);

  const handleClick = useCallback(() => {
    console.log("click", showContextMenu);
    // timeout to allow button click to fire before hiding menu
    // return (showContextMenu ? setTimeout(() => setShowContextMenu(false)) : null);
    if (showContextMenu) setTimeout(() => setShowContextMenu(false));
  }, [showContextMenu]);

  useEffect(() => {
    const ctx = new ContextMenuHandler((type: string, event: any) => {
      if (type === 'contextmenu') {
        setContextMenuPos({ x: event.pageX, y: event.pageY, });
        setContextMenuPosition({ x: event.pageX, y: event.pageY, });
        setTimeout(() => setShowContextMenu(true));
      } else {
        if (event.type === 'touchstart') {
          if (event.target.id === 'board') {
            setTimeout(() => setShowContextMenu(false));
          }
        }
      }
    });
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    // Touch events
    document.addEventListener('touchstart', ctx.onTouchStart);
    document.addEventListener('touchcancel', ctx.onTouchCancel);
    document.addEventListener('touchend', ctx.onTouchEnd);
    document.addEventListener('touchmove', ctx.onTouchMove);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);

      document.removeEventListener('touchstart', ctx.onTouchStart);
      document.removeEventListener('touchcancel', ctx.onTouchCancel);
      document.removeEventListener('touchend', ctx.onTouchEnd);
      document.removeEventListener('touchmove', ctx.onTouchMove);
    };
  });

  const bgColor = useColorModeValue('#EDF2F7', '#4A5568');

  return (
    showContextMenu ? (
      <div
        className="contextmenu"
        style={{
          top: contextMenuPos.y + 2,
          left: contextMenuPos.x + 2,
          backgroundColor: bgColor,
        }}
      >
        {props.children}
      </div >
    ) : (null)
  );
};
