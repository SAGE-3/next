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
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  // hide menu
  const [showContextMenu, setShowContextMenu] = useState(false);

  const handleContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      //check if right div ID is clicked
      if (event.target.id === props.divId) {
        setContextMenuPos({ x: event.pageX, y: event.pageY });
        setShowContextMenu(true);
      }
    },
    [setContextMenuPos]
  );

  const handleClick = useCallback(() => (showContextMenu ? setShowContextMenu(false) : null), [showContextMenu]);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  });

  // const bgColor = menuBgColor();
  const bgColor = useColorModeValue("#A0AEC0", "#4A5568");
  // const borderColor = useColorModeValue("#A0AEC0", "#4A5568");
  // const textColor = useColorModeValue("#2D3748", "#E2E8F0");

  return (
    showContextMenu ? (
      <div
        className="menu"
        style={{
          top: contextMenuPos.y + 2,
          left: contextMenuPos.x + 2,
          backgroundColor: bgColor,
        }}
      >
        {props.children}
      </div >
    ) : (
      <> </>
    )
  );
};
