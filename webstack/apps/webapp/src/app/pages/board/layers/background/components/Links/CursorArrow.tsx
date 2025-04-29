/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue } from '@chakra-ui/react';

// SAGE Imports
import { useThrottleApps, useUIStore, useCursorBoardPosition, useLinkStore } from '@sage3/frontend';

import { useEffect, useState } from 'react';

import { BoxToCursorArrow } from './DrawArrows';

// Keep seperate to avoid unnecessary rerenders caused by cursor movement
export function CursorArrow() {
  const linkedAppId = useLinkStore((state) => state.linkedAppId);
  return <>{linkedAppId && <ArrowToCursorMain linkedAppId={linkedAppId} />}</>;
}

function ArrowToCursorMain({ linkedAppId }: { linkedAppId: string }) {
  // const linkedAppId = useUIStore((state) => state.linkedAppId);
  const apps = useThrottleApps(200);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const boardSynced = useUIStore((state) => state.boardSynced);

  // Theme
  const strokeColor = useColorModeValue('gray.500', 'gray.500');

  // User Cursor
  // const { boardCursor: cursorPosition } = useCursorBoardPosition();
  const { uiToBoard } = useCursorBoardPosition();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      if (boardSynced) {
        setCursorPos(uiToBoard(e.clientX, e.clientY));
      }
    };

    window.addEventListener('mousemove', updateCursor, { passive: true });

    return () => {
      window.removeEventListener('mousemove', updateCursor);
    };
  }, [uiToBoard, boardSynced]);

  function buildArrow(src: string) {
    const srcApp = apps.find((a) => a._id === src);

    if (srcApp && cursorPos.x !== -1 && cursorPos.y !== -1) {
      const box = { position: srcApp.data.position, size: srcApp.data.size };
      return BoxToCursorArrow(box, cursorPos.x, cursorPos.y, strokeColor, 'red');
    }
    return null;
  }

  return (
    <>
      {linkedAppId && (
        <div className="arrows-container" style={{ pointerEvents: 'none', touchAction: 'auto' }}>
          <svg
            id="arrows-to-cursor"
            className="canvas-layer"
            style={{
              position: 'absolute',
              width: boardWidth + 'px',
              height: boardHeight + 'px',
              left: 0,
              top: 0,
              zIndex: 0,
            }}
          >
            {buildArrow(linkedAppId)}
          </svg>
        </div>
      )}
    </>
  );
}
