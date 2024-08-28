/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useCallback, useEffect } from 'react';
import { useColorModeValue } from '@chakra-ui/react';

import { useUIStore } from '../../../stores';
import ContextMenuHandler from './ContextMenuHandler';

import './style.scss';

/**
 * Convert a touch position to a mouse position
 *
 * @param {*} evt
 * @param {*} parent
 * @returns { x: number, y: number }
 */
function getOffsetPosition(evt: any, parent: any): { x: number; y: number } {
  const position = {
    x: evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX,
    y: evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY,
  };

  while (parent.offsetParent) {
    position.x -= parent.offsetLeft - parent.scrollLeft;
    position.y -= parent.offsetTop - parent.scrollTop;
    parent = parent.offsetParent;
  }

  return position;
}

/**
 * Check if the device is a touch device using CSS media queries
 * @returns boolean
 */
function isTouchDevice(): boolean {
  return window.matchMedia("(any-pointer: coarse)").matches;
}

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

  const handleClick = useCallback(() => {
    // timeout to allow button click to fire before hiding menu
    if (showContextMenu) {
      // setShowContextMenu(false);
      setTimeout(() => setShowContextMenu(false));
    }
  }, [showContextMenu]);


  const handleContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      // Check if right div ID is clicked
      // if (event.target.id === props.divId && !isTouchDevice()) {
      if (event.target.id === props.divId) {
        // Not Great but works for now
        const el = document.getElementById('this-context')?.getBoundingClientRect();
        const cmw = el ? el.width : 400;
        const cmh = el ? el.height : 200;
        let x = event.clientX;
        let y = event.clientY;
        if (x + cmw > window.innerWidth) x = event.clientX - cmw;
        if (y + cmh > window.innerHeight) y = event.clientY - cmh;
        // local position plus board position
        setContextMenuPos({ x, y });
        setContextMenuPosition({ x, y });
        setTimeout(() => setShowContextMenu(true));
      }
    },
    [setContextMenuPos, props.divId, setContextMenuPosition]
  );

  useEffect(() => {
    const ctx = new ContextMenuHandler((type: string, event: any) => {
      if (type === 'contextmenu') {
        const pos = getOffsetPosition(event, event.target);
        setContextMenuPos({ x: pos.x, y: pos.y });
        setContextMenuPosition({ x: pos.x, y: pos.y });
        setTimeout(() => setShowContextMenu(true));
      } else {
        if (event.type === 'touchstart' && showContextMenu) {
          if (event.target.id === 'board' || event.target.id === '') {
            setTimeout(() => setShowContextMenu(false), 400);
          }
        } else if (event.type === 'touchend' && showContextMenu) {
          document.removeEventListener('touchmove', ctx.onTouchMove);
        }
      }
    });
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    // Touch events
    if (isTouchDevice()) {
      document.addEventListener('touchstart', ctx.onTouchStart);
      document.addEventListener('touchcancel', ctx.onTouchCancel);
      document.addEventListener('touchend', ctx.onTouchEnd);
      document.addEventListener('touchmove', ctx.onTouchMove);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);

      if (isTouchDevice()) {
        document.removeEventListener('touchstart', ctx.onTouchStart);
        document.removeEventListener('touchcancel', ctx.onTouchCancel);
        document.removeEventListener('touchend', ctx.onTouchEnd);
        document.removeEventListener('touchmove', ctx.onTouchMove);
      }
    };
  }, [showContextMenu, handleClick, handleContextMenu, setContextMenuPosition]);

  const bgColor = useColorModeValue('#EDF2F7', '#4A5568');

  return showContextMenu ? (
    <div
      className="contextmenu"
      id="this-context"
      style={{
        top: contextMenuPos.y + 2,
        left: contextMenuPos.x + 2,
        backgroundColor: bgColor,
      }}
    >
      {props.children}
    </div>
  ) : null;
};
