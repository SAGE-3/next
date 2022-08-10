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

  const handleContextMenu = useCallback((event: any) => {
    event.preventDefault();
    // Check if right div ID is clicked
    if (event.target.id === props.divId) {
      // local position plus board position
      setContextMenuPos({ x: event.clientX, y: event.clientY, });
      setTimeout(() => setShowContextMenu(true));
    }
  }, [setContextMenuPos, props.divId]);

  const handleClick = useCallback(() => {
    // timeout to allow button click to fire before hiding menu
    return (showContextMenu ? setTimeout(() => setShowContextMenu(false)) : null);
  }, [showContextMenu]);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
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
