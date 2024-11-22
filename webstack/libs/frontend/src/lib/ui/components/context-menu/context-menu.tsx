/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useCallback, useEffect } from 'react';
import { IconButton } from '@chakra-ui/react';
import { MdClose } from 'react-icons/md';

import { useUIStore } from '../../../stores';
import { useHotkeys } from '../../../hooks';
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
 * ContextMenu component
 * @param props children divId
 * @returns JSX.Element
 */
export const ContextMenu = (props: { children: JSX.Element; divIds: string[] }) => {
  // Cursor position
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  // Hide menu
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Set the position of the context menu
  const setContextMenuPosition = useUIStore((state) => state.setContextMenuPosition);
  const setContextMenuOpen = useUIStore((state) => state.setContextMenuOpen);
  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);

  useEffect(() => {
    if (contextMenuPos !== contextMenuPosition) {
      setContextMenuPos(contextMenuPosition);
    }
  }, [contextMenuPosition, contextMenuPos]);

  useHotkeys('esc', () => {
    setShowContextMenu(false);
    setContextMenuOpen(false);
  });

  const handleContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      // Check if right div ID is clicked
      if (props.divIds.includes(event.target.id)) {
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
        setContextMenuOpen(true);
        setTimeout(() => setShowContextMenu(true));
      }
    },
    [props.divIds, setContextMenuPosition, setContextMenuOpen]
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
          if (props.divIds.includes(event.target.id) || event.target.id === '') {
            setTimeout(() => setShowContextMenu(false), 400);
          }
        } else if (event.type === 'touchend' && showContextMenu) {
          document.removeEventListener('touchmove', ctx.onTouchMove);
        }
      }
    });
    // document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      // document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [showContextMenu, handleContextMenu, setContextMenuPosition, props.divIds]);

  return showContextMenu ? (
    <div
      className="contextmenu"
      id="this-context"
      style={{
        top: contextMenuPos.y,
        left: contextMenuPos.x,
      }}
    >
      {props.children}
      <IconButton
        aria-label={'close-context'}
        icon={<MdClose />}
        size="sm"
        borderRadius={'100%'}
        position="absolute"
        transform={'translate(-50%, -50%)'}
        onClick={() => {
          setShowContextMenu(false);
          setContextMenuOpen(false);
        }}
        variant={'solid'}
        colorScheme="red"
      ></IconButton>
    </div>
  ) : null;
};
