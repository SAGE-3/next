/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';

import { DraggableEvent } from 'react-draggable';
import { DraggableData, Rnd } from 'react-rnd';

import { useUIStore, useAbility, useKeyPress } from '@sage3/frontend';

import { Background, Apps, Whiteboard, Lasso, PresenceComponent } from './components';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // Abilities
  const canLasso = useAbility('lasso', 'apps');

  // UI store
  const scale = useUIStore((state) => state.scale);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setBoardDragging = useUIStore((state) => state.setBoardDragging);
  const boardLocked = useUIStore((state) => state.boardLocked);
  const lassoMode = useUIStore((state) => state.lassoMode);
  const primaryActionMode = useUIStore((state) => state.primaryActionMode);

  const setBoardSynced = useUIStore((state) => state.setBoardSynced);
  const setScale = useUIStore((state) => state.setScale)


  // Local States with Delayed Syncing to useUIStore
  const [localBoardPosition, setLocalBoardPosition] = useState({ x: 0, y: 0, scale: 0 });
  const [localSynced, setLocalSynced] = useState(true); // optimize performance against the useUIStore
  const [lastTouch, setLastTouch] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const [startedDragOn, setStartedDragOn] = useState<"board" | "app" | "other">("other"); // Used to differentiate between board drag and app deselect

  // The fabled isMac const
  const isMac = useMemo(() => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent), [])


  // const movementAltMode = useKeyPress(' ');
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // There is a major bug with Rnd, where dragging/ while zooming or immedately thereafter
  // Will either move or vanish the appWindow.  We introduce movementZoomSafetyTimeoutRef
  // as a temporary solution to lock the ability to drag a second after the localZoom function occurs
  // Note that this will not fix the + - zoom hotkeys and this is only targeted to band-aid fix
  // the point where the highest frequency of this issue will occur (e.g. the new movement scheme)
  const movementZoomSafetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Local State
  const [boardDrag, setBoardDrag] = useState(false); // Used to differentiate between board drag and app deselect

  // Drag start of the board
  function handleDragBoardStart() {
    // setBoardDragging(true);
    if (selectedApp) {
      setSelectedApp('');
    }
  }

  // Handle Dragging
  function handleDragging() {
    if (!boardDrag) {
      setBoardDrag(true);
      // on the first move, set the board to dragging
      setBoardDragging(true);
    }
  }






  // Bulk of Movement Code Starts Here

  // // // Temporary! (Only to change cursor, find a better solution that will show the same effect for touch pad and mouse)
  // useEffect(() => {
  //   if (!selectedApp)
  //     setBoardDragging(primaryActionMode === "grab")
  //   // setBoardDrag(movementAltMode)
  // }, [primaryActionMode, selectedApp]);

  // Forward boardPosition to localBoardPosition
  useEffect(() => {
    setLocalBoardPosition({ x: boardPosition.x, y: boardPosition.y, scale: scale })
  }, [boardPosition.x, boardPosition.y, scale]);

  // Forwards synced information to uiStore
  useEffect(() => {
    setBoardSynced(localSynced)
  }, [localSynced]);

  // Forward local position and scale to uiStore
  useEffect(() => {
    if (movementTimeoutRef.current !== null) {
      clearTimeout(movementTimeoutRef.current);
    }
    if (movementZoomSafetyTimeoutRef.current !== null) {
      clearTimeout(movementZoomSafetyTimeoutRef.current);
    }
    setLocalSynced(false);

    movementTimeoutRef.current = setTimeout(() => {
      console.log("no movement detected");
      setBoardPosition({ x: localBoardPosition.x, y: localBoardPosition.y });
      setScale(localBoardPosition.scale);
      // setLocalSynced(true);
      // Additional wait time as bandaid-fix to Rnd drag issue
      movementZoomSafetyTimeoutRef.current = setTimeout(() => {
        setLocalSynced(true);
      }, 100)
    }, 250);
  }, [localBoardPosition.x, localBoardPosition.y, localBoardPosition.scale]);
  // boardDragging

  // You need to eventually sync this with useUIStore's values
  const WheelStepZoom = 0.008;
  const MinZoom = 0.1;
  const MaxZoom = 3;

  const localZoomInDelta = (d: number, cursor: { x: number, y: number }) => {
    const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
    setLocalBoardPosition(prev => {
      return zoomOnLocationNewPosition(
        { x: prev.x, y: prev.y },
        { x: cursor.x, y: cursor.y },
        prev.scale,
        Math.min(prev.scale + step * prev.scale, MaxZoom))
    });
  }
  const localZoomOutDelta = (d: number, cursor: { x: number, y: number }) => {
    const step = Math.min(Math.abs(d), 10) * WheelStepZoom;
    setLocalBoardPosition(prev => {
      return zoomOnLocationNewPosition(
        { x: prev.x, y: prev.y },
        { x: cursor.x, y: cursor.y },
        prev.scale,
        Math.max(prev.scale - step * prev.scale, MinZoom))
    });
  }

  const draggedOnCheck = (event: any) => {
    const target = event.target as HTMLElement
    // Target.id was done because of the following assumption:
    // Using ids is faster than using classList.contains(...)
    if ([target.id === 'board', target.id === 'lasso', target.id === 'whiteboard'].some(condition => condition))
    { 
      setStartedDragOn("board") 
    }
    else if (target.classList.contains('handle')) { 
      setStartedDragOn("app") 
    }
    else {
      setStartedDragOn("other")
    }
  }

  // Make sure the initial mouse click is on a valid surface
  useEffect(() => {
    const handleMouseStart = (event: MouseEvent) => {
      draggedOnCheck(event)
    }

    window.addEventListener('mousedown', handleMouseStart, { passive: false });
    return () => {
      window.removeEventListener('mousedown', handleMouseStart);
    };
  }, []);

  // Movement with Page Zoom Inhibitors (For Mouse & Trackpad)
  useEffect(() => {
    // Mouse & Touchpad
    const handleMove = (event: WheelEvent) => {
      if (event.ctrlKey) { event.preventDefault() }
      if (boardLocked) { return }
      if (selectedApp) { return }

      // This is a workable solution to having this calcuation done on a psudeo init-like behaviour
      // Note that if someone is wheeling on the board and then quickly wheels on a panel, the board will move
      // until the user stops giving input and then the proper behaviour will resume
      setLocalSynced(prev => {
        if (prev) {
          draggedOnCheck(event)
        }
        return prev
      })


      setStartedDragOn(draggedOn => {
        if (draggedOn === "other") { return draggedOn }
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
          setLocalBoardPosition(prev => ({
            x: prev.x - ((!isMac && event.shiftKey) ? event.deltaY : event.deltaX) / prev.scale,
            y: prev.y - ((!isMac && event.shiftKey) ? event.deltaX : event.deltaY) / prev.scale,
            scale: prev.scale
          }));
        }
        return draggedOn
      })

    };

    // Mouse
    const handleMouseMove = (event: MouseEvent) => {
      if (boardLocked) { return }
      if (selectedApp) { return }
      // || haveLasso
      const move = () => {
        setLocalBoardPosition(prev => ({
          x: prev.x + (event.movementX * 1) / prev.scale,
          y: prev.y + (event.movementY * 1) / prev.scale,
          scale: prev.scale
        }));

        event.stopPropagation()
        event.preventDefault()
      }

      setStartedDragOn(draggedOn => {
        // Tranversal/Panning
        if (primaryActionMode === "grab" && event.buttons & 1 && draggedOn === "board") {
          move()
        }
        else if (event.buttons & 4 && (draggedOn === "app" || draggedOn === "board")) {
          // 1.333333333 @ zoomLvl 75%
          move()
        }
        return draggedOn
      })
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('wheel', handleMove, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleMove);
    };
  }, [selectedApp, primaryActionMode, boardLocked]); //haveLasso


  // Movement with Page Zoom Inhibitors (For Touch Screen)
  useEffect(() => {
    // For keeping track of deltas (up to five fingers supported)
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 1 && event.touches.length <= 5) {
        // event.preventDefault();
        const validIDSet = new Set(["board", "lasso"]); // Do not add whiteboard here
        const allTouchesAreOnValidID = Array.from(event.targetTouches).every(touch => 
          validIDSet.has((touch.target as HTMLElement).id)
        );

        // could also be app, but we ignore that case or touch users
        setStartedDragOn(draggedOn => allTouchesAreOnValidID ? "board" : "other")

        setLastTouch(Array.from(event.touches).map((touch, index) => {
          return { x: touch.clientX, y: touch.clientY }
        }))
      }
    }

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

      // if (!boardLocked)
      if (boardLocked) { return }
      if (selectedApp) { return }

      // This is expensive, but unforseen behaviours may require it in the future...
      // vvvvvvvvvvvv
      // const validClasses = ['board-handle', 'canvas-container', 'canvas-layer'];
      // const allTouchesAreOnValidClasses = Array.from(event.targetTouches).every(t => 
      //   validClasses.some(className => (t.target as HTMLElement).classList.contains(className))
      // );
      // ^^^^^^^^^^^^

      // if (primaryActionMode === "grab") {
      //   // const allTouchesAreOnValidClasses = Array.from(event.targetTouches).every(t => (t.target as HTMLElement).classList.contains('board-handle'));
      //   const allTouchesAreOnValidID = Array.from(event.targetTouches).every(t => (t.target as HTMLElement).id === "board")
      //   if (!allTouchesAreOnValidID) {
      //     return
      //   }
      // }
      // // else if (primaryActionMode === "lasso") {
      // else {
      //   // const allTouchesAreOnValidClasses = Array.from(event.targetTouches).every(t => (t.target as HTMLElement).classList.contains('canvas-layer'));
      //   const allTouchesAreOnValidID = Array.from(event.targetTouches).every(t => (t.target as HTMLElement).id === "lasso")
      //   if (!allTouchesAreOnValidID) {
      //     return
      //   }
      // }

      setStartedDragOn(draggedOn => {
        if (draggedOn === "other") { return draggedOn }
        // if (event.touches.length === 1) {
        //  // Looking for lasso interaction? Touch lasso are handled in Lasso.tsx
        // }
        if (event.touches.length === 1) {
          setLastTouch(prev => {
            const delta0X = prev[0].x - event.touches[0].clientX
            const delta0Y = prev[0].y - event.touches[0].clientY

            setLocalBoardPosition(prevBoard => {
              return ({
                x: prevBoard.x - delta0X / prevBoard.scale,
                y: prevBoard.y - delta0Y / prevBoard.scale,
                scale: prevBoard.scale
              })
            });
            // }
            return ([
              { x: event.touches[0].clientX, y: event.touches[0].clientY }
            ])
          });
        }
        else if (event.touches.length === 2) {
          setLastTouch(prev => {
            const delta0X = prev[0].x - event.touches[0].clientX
            const delta0Y = prev[0].y - event.touches[0].clientY

            const delta1X = prev[1].x - event.touches[1].clientX
            const delta1Y = prev[1].y - event.touches[1].clientY

            // Pan
            const avgDeltaX = (delta0X + delta1X) / 2;
            const avgDeltaY = (delta0Y + delta1Y) / 2;

            // Zoom
            const prevDistance = magnitude({ x: prev[0].x, y: prev[0].y }, { x: prev[1].x, y: prev[1].y }); // Store this calc in mem so we dont have to recalc again...
            const distance = magnitude({ x: event.touches[0].clientX, y: event.touches[0].clientY }, { x: event.touches[1].clientX, y: event.touches[1].clientY });
            // const prevDistance = Math.sqrt(Math.pow(prev[0].x - prev[1].x, 2) + Math.pow(prev[0].y - prev[1].y, 2));
            // const distance = Math.sqrt(Math.pow(event.touches[0].clientX - event.touches[1].clientX, 2) + Math.pow(event.touches[0].clientY - event.touches[1].clientY, 2));

            const zoomDelta = prevDistance - distance;
            const avgX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const avgY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            // console.log(Math.abs(zoomDelta), (Math.abs(avgDeltaX) + Math.abs(avgDeltaY)/2))

            // if (Math.abs(zoomDelta) > ((Math.abs(avgDeltaX) + Math.abs(avgDeltaY)/2)) + 2) {
            if (prevDistance > 0) {
              if (zoomDelta < 0) {
                localZoomInDelta(zoomDelta, { x: avgX, y: avgY });
              } else if (zoomDelta > 0) {
                localZoomOutDelta(zoomDelta, { x: avgX, y: avgY });
              }
            }

            setLocalBoardPosition(prevBoard => {
              return ({
                x: prevBoard.x - avgDeltaX / prevBoard.scale,
                y: prevBoard.y - avgDeltaY / prevBoard.scale,
                scale: prevBoard.scale
              })
            });

            return ([
              { x: event.touches[0].clientX, y: event.touches[0].clientY },
              { x: event.touches[1].clientX, y: event.touches[1].clientY }
            ])
          });
        }
        return draggedOn
      })
    }


    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [selectedApp, primaryActionMode, boardLocked]);
  // Bulk of Movement Code Ends Here


  // On a drag stop of the board. Set the board position locally.
  function handleDragBoardStop(event: DraggableEvent, data: DraggableData) {
    const x = data.x;
    const y = data.y;
    setBoardPosition({ x, y });
    setBoardDragging(false);
    // If this was just a click, then deselect the app.
    // If it was a drag, then don't deselect the app.
    if (!boardDrag) {
      setSelectedApp('');
      clearSelectedApps();
    }
    setBoardDrag(false);
  }

  return (
    <Box transform={`scale(${localBoardPosition.scale})`} transformOrigin={'top left'}>
      {/* Board. Uses lib react-rnd for drag events.
       * Draggable Background below is the actual target for drag events.*/}
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
        // onDragStart={handleDragBoardStart}
        // onDrag={handleDragging}
        // onDragStop={handleDragBoardStop}
        enableResizing={false}
        dragHandleClassName={'board-handle'}
        // disableDragging={boardLocked}
        disableDragging={true}

      // onTouchStart={handleTouchStart}
      // onTouchMove={handleTouchMove}
      // onPointerDown={onPointerDown}
      // onPointerMove={onPointerMove}
      // onPointerUp={onPointerUp}
      // onPointerCancel={onPointerUp}
      // onPointerOut={onPointerUp}
      // onPointerLeave={onPointerUp}
      >
        {/* The board's apps */}
        <Apps />
        {/*Whiteboard */}
        <Whiteboard boardId={props.boardId} />
        {/*Lasso */}
        {/* {canLasso && lassoMode && <Lasso boardId={props.boardId} />} */}
        {canLasso && primaryActionMode === "lasso" && <Lasso boardId={props.boardId} />}

        {/* Presence of the users */}
        <PresenceComponent boardId={props.boardId} />

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId} />
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
): { x: number; y: number, scale: number } {
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

function magnitude(a: { x: number, y: number }, b: { x: number, y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt((dx * dx) + (dy * dy));
};