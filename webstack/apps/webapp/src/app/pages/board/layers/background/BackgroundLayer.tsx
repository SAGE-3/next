/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Rnd } from 'react-rnd';

import { useUIStore, useAbility, WheelStepZoom, MinZoom, MaxZoom, useUserSettings } from '@sage3/frontend';
import { Background, Apps, Whiteboard, Lasso, PresenceComponent, RndSafety } from './components';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // Abilities
  const canLasso = useAbility('lasso', 'apps');

  // Settings
  const { settings } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  // UI store
  const scale = useUIStore((state) => state.scale);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardLocked = useUIStore((state) => state.boardLocked);
  const setBoardSynced = useUIStore((state) => state.setBoardSynced);
  const setScale = useUIStore((state) => state.setScale);

  // Local States with Delayed Syncing to useUIStore
  const [localBoardPosition, setLocalBoardPosition] = useState({ x: 0, y: 0, scale: 0 });
  const [localSynced, setLocalSynced] = useState(true); // optimize performance against the useUIStore
  const [, setLastTouch] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const [, setStartedDragOn] = useState<'board' | 'board-actions' | 'app' | 'other'>('other'); // Used to differentiate between board drag and app deselect

  // The fabled isMac const
  const isMac = useMemo(() => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent), []);

  // const movementAltMode = useKeyPress(' ');
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const movementZoomSafetyTimeoutRef = useRef<number | null>(null);

  // Bulk of Movement Code Starts Here
  // Forward boardPosition to localBoardPosition
  useEffect(() => {
    setLocalBoardPosition({ x: boardPosition.x, y: boardPosition.y, scale: scale });
  }, [boardPosition.x, boardPosition.y, scale]);

  // Forwards synced information to uiStore
  useEffect(() => {
    setBoardSynced(localSynced);
  }, [localSynced]);

  // Forward local position and scale to uiStore
  useEffect(() => {
    if (movementTimeoutRef.current !== null) {
      clearTimeout(movementTimeoutRef.current);
    }
    if (movementZoomSafetyTimeoutRef.current !== null) {
      window.clearTimeout(movementZoomSafetyTimeoutRef.current);
    }
    setLocalSynced(false);

    movementTimeoutRef.current = setTimeout(() => {
      setBoardPosition({ x: localBoardPosition.x, y: localBoardPosition.y });
      setScale(localBoardPosition.scale);

      // This secondary delay may not be strickly neccessary as we also have rndSafety.tsx
      movementZoomSafetyTimeoutRef.current = window.setTimeout(() => {
        setLocalSynced(true);
      }, 50);
    }, 250);
  }, [localBoardPosition.x, localBoardPosition.y, localBoardPosition.scale]);

  const localZoomInDelta = (d: number, cursor: { x: number; y: number }) => {
    const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
    setLocalBoardPosition((prev) => {
      return zoomOnLocationNewPosition(
        { x: prev.x, y: prev.y },
        { x: cursor.x, y: cursor.y },
        prev.scale,
        Math.min(prev.scale + step * prev.scale, MaxZoom)
      );
    });
  };
  const localZoomOutDelta = (d: number, cursor: { x: number; y: number }) => {
    const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
    setLocalBoardPosition((prev) => {
      return zoomOnLocationNewPosition(
        { x: prev.x, y: prev.y },
        { x: cursor.x, y: cursor.y },
        prev.scale,
        Math.max(prev.scale - step * prev.scale, MinZoom)
      );
    });
  };

  const draggedOnCheck = (event: any) => {
    const target = event.target as HTMLElement;
    // Target.id was done because of the following assumption: using ids is faster than using classList.contains(...)
    if (target.id === 'board') {
      setStartedDragOn('board');
    } else if ([target.id === 'lasso', target.id === 'whiteboard'].some((condition) => condition)) {
      setStartedDragOn('board-actions');
    } else if (target.classList.contains('handle')) {
      setStartedDragOn('app');
    } else {
      setStartedDragOn('other');
    }
  };

  const draggedOnTouchCheck = (event: TouchEvent) => {
    const checkValidIds = (validIds: string[]) => {
      const allTouchesAreOnValidID = Array.from(event.touches).every((touch) => validIds.includes((touch.target as HTMLElement).id));
      return allTouchesAreOnValidID;
    };

    const checkValidClassIfOnlyOneTouch = (className: string) => {
      const allTouchesAreOnValidClass = Array.from(event.touches).some((touch) =>
        (touch.target as HTMLElement).classList.contains(className)
      );
      return allTouchesAreOnValidClass;
    };

    if (checkValidClassIfOnlyOneTouch('handle')) {
      setStartedDragOn('app');
    } else if (checkValidIds(['board'])) {
      setStartedDragOn('board');
    } else if (checkValidIds(['lasso', 'whiteboard'])) {
      setStartedDragOn('board-actions');
    } else {
      setStartedDragOn('other');
    }
  };

  // Make sure the initial mouse click is on a valid surface
  useEffect(() => {
    const handleMouseStart = (event: MouseEvent) => {
      draggedOnCheck(event);
    };

    window.addEventListener('mousedown', handleMouseStart, { passive: false });
    return () => {
      window.removeEventListener('mousedown', handleMouseStart);
    };
  }, []);

  // Movement with Page Zoom Inhibitors (For Mouse & Trackpad)
  useEffect(() => {
    // Mouse & Touchpad
    const handleMove = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
      if (boardLocked) {
        return;
      }
      if (selectedApp) {
        return;
      }

      // This is a workable solution to have a psudeo onWheelStart-like behaviour
      // Note that if someone is wheeling on the board and then quickly wheels on a panel, the board will move
      // until the user stops giving input and then the proper behaviour will resume
      setLocalSynced((prev) => {
        if (prev) {
          draggedOnCheck(event);
        }
        return prev;
      });

      setStartedDragOn((draggedOn) => {
        if (draggedOn === 'other') {
          return draggedOn;
        }
        // Zooming
        if (event.ctrlKey || event.metaKey) {
          const cursor = { x: event.clientX, y: event.clientY };
          if (event.deltaY < 0) {
            localZoomInDelta(event.deltaY, cursor);
          } else if (event.deltaY > 0) {
            localZoomOutDelta(event.deltaY, cursor);
          }
        }
        // Transversal/Panning
        else {
          // Flip axis for mouse scroll wheel users
          setLocalBoardPosition((prev) => ({
            x: prev.x - (!isMac && event.shiftKey ? event.deltaY : event.deltaX) / prev.scale,
            y: prev.y - (!isMac && event.shiftKey ? event.deltaX : event.deltaY) / prev.scale,
            scale: prev.scale,
          }));
        }
        return draggedOn;
      });
    };

    // Mouse
    const handleMouseMove = (event: MouseEvent) => {
      if (boardLocked) {
        return;
      }
      if (selectedApp) {
        return;
      }
      const move = () => {
        setLocalBoardPosition((prev) => ({
          x: prev.x + (event.movementX * 1) / prev.scale,
          y: prev.y + (event.movementY * 1) / prev.scale,
          scale: prev.scale,
        }));

        event.stopPropagation();
        event.preventDefault();
      };

      setStartedDragOn((draggedOn) => {
        // Tranversal/Panning
        if (primaryActionMode === 'grab' && event.buttons & 1 && draggedOn === 'board') {
          move();
        } else if (event.buttons & 4 && (draggedOn === 'app' || draggedOn === 'board' || draggedOn === 'board-actions')) {
          move();
        }
        return draggedOn;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('wheel', handleMove, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleMove);
    };
  }, [selectedApp, primaryActionMode, boardLocked]);

  // Movement with Page Zoom Inhibitors (For Touch Screen)
  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 1) {
        draggedOnTouchCheck(event);

        setLastTouch(
          Array.from(event.touches).map((touch, index) => {
            return { x: touch.clientX, y: touch.clientY };
          })
        );
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  useEffect(() => {
    // Touch Screen
    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (boardLocked) {
        return;
      }
      if (selectedApp) {
        return;
      }

      setStartedDragOn((draggedOn) => {
        if (draggedOn === 'other' || draggedOn === 'app') {
          return draggedOn;
        }
        if (event.touches.length === 1) {
          // Looking for lasso interaction? Touch lasso are handled in Lasso.tsx
          if (primaryActionMode === 'grab' && draggedOn !== 'board-actions') {
            setLastTouch((prev) => {
              if (prev.length < 1) {
                return prev;
              }

              const delta0X = prev[0].x - event.touches[0].clientX;
              const delta0Y = prev[0].y - event.touches[0].clientY;

              setLocalBoardPosition((prevBoard) => {
                return {
                  x: prevBoard.x - delta0X / prevBoard.scale,
                  y: prevBoard.y - delta0Y / prevBoard.scale,
                  scale: prevBoard.scale,
                };
              });
              // }
              return [{ x: event.touches[0].clientX, y: event.touches[0].clientY }];
            });
          }
        } else if (event.touches.length === 2) {
          setLastTouch((prev) => {
            if (prev.length < 2) {
              return prev;
            }

            const delta0X = prev[0].x - event.touches[0].clientX;
            const delta0Y = prev[0].y - event.touches[0].clientY;

            const delta1X = prev[1].x - event.touches[1].clientX;
            const delta1Y = prev[1].y - event.touches[1].clientY;

            // Pan
            const avgDeltaX = (delta0X + delta1X) / 2;
            const avgDeltaY = (delta0Y + delta1Y) / 2;

            // Zoom
            const prevDistance = magnitude({ x: prev[0].x, y: prev[0].y }, { x: prev[1].x, y: prev[1].y });
            const distance = magnitude(
              { x: event.touches[0].clientX, y: event.touches[0].clientY },
              { x: event.touches[1].clientX, y: event.touches[1].clientY }
            );
            const zoomDelta = prevDistance - distance;
            const avgX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const avgY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            if (prevDistance > 0) {
              if (zoomDelta < 0) {
                localZoomInDelta(zoomDelta, { x: avgX, y: avgY });
              } else if (zoomDelta > 0) {
                localZoomOutDelta(zoomDelta, { x: avgX, y: avgY });
              }
            }

            setLocalBoardPosition((prevBoard) => {
              return {
                x: prevBoard.x - avgDeltaX / prevBoard.scale,
                y: prevBoard.y - avgDeltaY / prevBoard.scale,
                scale: prevBoard.scale,
              };
            });

            return [
              { x: event.touches[0].clientX, y: event.touches[0].clientY },
              { x: event.touches[1].clientX, y: event.touches[1].clientY },
            ];
          });
        }
        return draggedOn;
      });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [selectedApp, primaryActionMode, boardLocked]);

  return (
    <Box transform={`scale(${localBoardPosition.scale})`} transformOrigin={'top left'}>
      {/* Board. Uses lib react-rnd for drag events. Draggable Background below is the actual target for drag events.*/}
      <Rnd
        // Remember board position and size
        default={{
          x: boardPosition.x,
          y: boardPosition.y,
          width: boardWidth,
          height: boardHeight,
        }}
        scale={localBoardPosition.scale}
        position={{ x: localBoardPosition.x, y: localBoardPosition.y }}
        enableResizing={false}
        dragHandleClassName={'board-handle'}
        disableDragging={true}
      >
        {/* The board's apps */}
        <Apps />
        {/* Whiteboard */}
        <Whiteboard roomId={props.roomId} boardId={props.boardId} />
        {/* Lasso */}
        {canLasso && primaryActionMode === 'lasso' && <Lasso roomId={props.roomId} boardId={props.boardId} />}

        {/* Presence of the users */}
        <PresenceComponent boardId={props.boardId} />

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId} />

        {/* Rnd Safety to Mitigate app click dissapear issue when using new movement scheme */}
        <RndSafety />
      </Rnd>
    </Box>
  );
}

// This code has been modified from the one present in useUIStore
function zoomOnLocationNewPosition(
  fromPosition: { x: number; y: number },
  towardsPos: { x: number; y: number },
  prevScale: number,
  scale: number
): { x: number; y: number; scale: number } {
  const x1 = fromPosition.x - towardsPos.x / prevScale;
  const y1 = fromPosition.y - towardsPos.y / prevScale;
  const x2 = fromPosition.x - towardsPos.x / scale;
  const y2 = fromPosition.y - towardsPos.y / scale;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const x = fromPosition.x - dx;
  const y = fromPosition.y - dy;
  return { x, y, scale };
}

function magnitude(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
