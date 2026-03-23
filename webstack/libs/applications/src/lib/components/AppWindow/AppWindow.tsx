/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, useToast, useColorModeValue, Icon, Portal, Button } from '@chakra-ui/react';

import { MdWindow } from 'react-icons/md';
import { IconType } from 'react-icons/lib';

// SAGE3 Frontend
import {
  useAppStore,
  useUIStore,
  useHexColor,
  useAbility,
  useInsightStore,
  useUserSettings,
  useCursorBoardPosition,
} from '@sage3/frontend';

// Window Components
import { App } from '../../schema';
import { ProcessingBox, BlockInteraction, WindowTitle, WindowBorder } from './components';

// Constraints on the app window size
const APP_MIN_WIDTH = 200;
const APP_MIN_HEIGHT = 100;
const APP_MAX_WIDTH = 8 * 1024;
const APP_MAX_HEIGHT = 8 * 1024;

// Window borders
type Side = 'left' | 'right' | 'top' | 'bottom';
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type HitType = { edge?: Side; corner?: Corner } | null;

// Resize handle directions
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type WindowProps = {
  app: App;
  children: JSX.Element;
  // Control the window aspect ratio (optional)
  lockAspectRatio?: boolean | number;
  lockToBackground?: boolean;
  processing?: boolean;
  disableResize?: boolean;
  background?: boolean;
  // Hide App when outside of the viewport or when dragging the board
  hideBackgroundColor?: string;
  hideBordercolor?: string;
  hideBackgroundIcon?: IconType;
};

// Resize handle positions: CSS styles keyed by direction
const RESIZE_HANDLE_SIZE = 10;
const resizeHandleBaseStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 10,
};

function getResizeHandleStyle(dir: ResizeDirection, handleSize: number): React.CSSProperties {
  const h = handleSize;
  const half = h / 2;
  switch (dir) {
    case 'nw': return { ...resizeHandleBaseStyle, top: -half, left: -half, width: h, height: h, cursor: 'nw-resize' };
    case 'n':  return { ...resizeHandleBaseStyle, top: -half, left: half, right: half, height: h, cursor: 'n-resize' };
    case 'ne': return { ...resizeHandleBaseStyle, top: -half, right: -half, width: h, height: h, cursor: 'ne-resize' };
    case 'e':  return { ...resizeHandleBaseStyle, top: half, bottom: half, right: -half, width: h, cursor: 'e-resize' };
    case 'se': return { ...resizeHandleBaseStyle, bottom: -half, right: -half, width: h, height: h, cursor: 'se-resize' };
    case 's':  return { ...resizeHandleBaseStyle, bottom: -half, left: half, right: half, height: h, cursor: 's-resize' };
    case 'sw': return { ...resizeHandleBaseStyle, bottom: -half, left: -half, width: h, height: h, cursor: 'sw-resize' };
    case 'w':  return { ...resizeHandleBaseStyle, top: half, bottom: half, left: -half, width: h, cursor: 'w-resize' };
  }
}

const RESIZE_DIRECTIONS: ResizeDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function AppWindow(props: WindowProps) {
  // Settings
  const { settings, toggleShowUI } = useUserSettings();
  const showUI = settings.showUI;
  const primaryActionMode = settings.primaryActionMode;

  // Can update
  const canMove = useAbility('move', 'apps');
  const canResize = useAbility('resize', 'apps');

  // App Store
  const update = useAppStore((state) => state.update);
  const updateAppLocationByDelta = useAppStore((state) => state.updateAppLocationByDelta);
  const bringForward = useAppStore((state) => state.bringForward);

  // Error Display Handling
  const storeError = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  // UI store for global setting
  const scaleRef = useRef(1);
  const zindex = useUIStore((state) => state.zIndex);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const appDragging = useUIStore((state) => state.appDragging);
  const setAppDragging = useUIStore((state) => state.setAppDragging);
  const incZ = useUIStore((state) => state.incZ);
  const viewport = useUIStore((state) => state.viewport);
  const selectedTag = useUIStore((state) => state.selectedTag);
  const localDeltaMove = useUIStore((state) => state.deltaLocalMove[props.app._id]);
  const setLocalDeltaMove = useUIStore((state) => state.setDeltaLocalMove);
  const { uiToBoard } = useCursorBoardPosition();

  // Keep scaleRef up to date without re-renders
  useEffect(() => {
    return useUIStore.subscribe((state) => {
      scaleRef.current = state.scale;
    });
  }, []);

  // Selected Apps Info
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const addSelectedApp = useUIStore((state) => state.addSelectedApp);
  const removeSelectedApp = useUIStore((state) => state.removeSelectedApp);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const selected = selectedApp === props.app._id;
  const selectedApps = useUIStore((state) => state.selectedAppsIds);

  // Tag Highlight
  const insights = useInsightStore((state) => state.insights);
  const myInsights = insights.find((el) => props.app._id == el.data.app_id);
  const myLabels = myInsights ? myInsights.data.labels : [];
  const isHighlight = myLabels.includes(selectedTag);

  // Lasso Information
  const lassoMode = useUIStore((state) => state.lassoMode);
  const isGrouped = selectedApps.includes(props.app._id);

  // Local state
  const [pos, setPos] = useState({ x: props.app.data.position.x, y: props.app.data.position.y });
  const [size, setSize] = useState({ width: props.app.data.size.width, height: props.app.data.size.height });
  const [myZ, setMyZ] = useState(zindex);
  const [appWasDragged, setAppWasDragged] = useState(false);

  // Refs for drag — avoids stale closures and prevents position jumps from server updates during drag
  const dragActiveRef = useRef(false);
  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const appWasDraggedRef = useRef(false);

  // Refs for resize
  const resizeActiveRef = useRef(false);
  const resizeDirRef = useRef<ResizeDirection>('se');
  const resizeStartRef = useRef({ clientX: 0, clientY: 0, x: 0, y: 0, w: 0, h: 0 });

  // Aspect ratio: false | true (1:1) | number
  const aspectRatio = props.lockAspectRatio ?? false;

  // Colors and Styling
  const bg = useColorModeValue('gray.100', 'gray.700');
  const backgroundColor = useHexColor(bg);
  const bc = useColorModeValue('gray.300', 'gray.600');
  const borderColor = useHexColor(bc);
  const selectColor = useHexColor('teal');
  const shadowColor = useColorModeValue('rgba(0 0 0 / 25%)', 'rgba(0 0 0 / 50%)');

  // Border Radius (https://www.30secondsofcode.org/articles/s/css-nested-border-radius)
  // scaleRef is used for display only here — just read scale from store for style
  const scale = useUIStore((state) => state.scale);
  const borderWidth = Math.min(Math.max(4 / scale, 1), selected ? 10 : 4);
  const outerBorderRadius = 12;
  const innerBorderRadius = outerBorderRadius - borderWidth;

  // Resize Handle scale
  const enableResize = props.disableResize === undefined ? true : !props.disableResize;
  const isPinned = props.app.data.pinned === undefined ? false : props.app.data.pinned;
  // Background
  const background = props.background === undefined ? true : props.background;

  // Make the handles a little bigger when the scale is small
  const invScale = Math.round(1 / scale);
  const handlePixelSize = Math.max(RESIZE_HANDLE_SIZE, Math.min(invScale * RESIZE_HANDLE_SIZE, 10 * RESIZE_HANDLE_SIZE));

  // Can this app be dragged / resized right now
  const canDrag = canMove && !isPinned && primaryActionMode !== 'grab' && primaryActionMode !== 'linker';
  const canResizeNow = enableResize && canResize && !isPinned && primaryActionMode === 'lasso';

  // Display messages
  const toast = useToast();
  const toastID = 'error-toast';

  // Track the app store errors
  useEffect(() => {
    if (storeError) {
      if (storeError.id && storeError.id === props.app._id) {
        if (!toast.isActive(toastID)) {
          toast({ id: toastID, description: 'Error - ' + storeError.msg, status: 'warning', duration: 3000, isClosable: true });
        } else {
          toast.update(toastID, { description: 'Error - ' + storeError.msg, status: 'warning', duration: 3000, isClosable: true });
        }
      }
      clearError();
    }
  }, [storeError]);

  // If size or position change from server, update local state (but not during active drag/resize)
  useEffect(() => {
    if (dragActiveRef.current || resizeActiveRef.current) return;
    setSize({ width: props.app.data.size.width, height: props.app.data.size.height });
    setPos({ x: props.app.data.position.x, y: props.app.data.position.y });
  }, [props.app.data.size.width, props.app.data.size.height, props.app.data.position.x, props.app.data.position.y]);

  // Local state for dragging multiple apps
  useEffect(() => {
    if (localDeltaMove && props.app.data.pinned === false) {
      const dx = localDeltaMove.x;
      const dy = localDeltaMove.y;
      setPos({ x: props.app.data.position.x + dx, y: props.app.data.position.y + dy });
    }
  }, [localDeltaMove, props.app.data.pinned]);

  // Track raised state
  useEffect(() => {
    if (props.app.data.raised) {
      if (!props.lockToBackground) {
        setMyZ(zindex + 1);
        incZ();
      }
    }
  }, [props.app.data.raised]);

  // One-time init: ensure pinned field exists on older apps that predate the field
  useEffect(() => {
    if (props.app.data.pinned === undefined) {
      update(props.app._id, { pinned: false });
    }
  }, []);

  // Deselect on unmount so stale selectedAppId doesn't linger
  useEffect(() => {
    return () => {
      if (selectedApp === props.app._id) {
        setSelectedApp('');
      }
    };
  }, [selectedApp]);

  function handleBringAppForward() {
    bringForward(props.app._id);
  }

  // ─── Drag handlers ────────────────────────────────────────────────────────

  function handleDragPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canDrag) return;
    // In lasso mode, shift+click toggles selection — let it through to onClick
    if (primaryActionMode === 'lasso' && e.shiftKey) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragActiveRef.current = true;
    appWasDraggedRef.current = false;
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = { x: pos.x, y: pos.y };
    setAppWasDragged(false);
    setAppDragging(true);
    handleBringAppForward();
    if (isGrouped) {
      const otherIds = selectedApps.filter((id) => id !== props.app._id);
      setLocalDeltaMove({ x: 0, y: 0 }, otherIds);
    }
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragActiveRef.current) return;
    const s = scaleRef.current;
    const dx = (e.clientX - dragStartClientRef.current.x) / s;
    const dy = (e.clientY - dragStartClientRef.current.y) / s;
    const newX = dragStartPosRef.current.x + dx;
    const newY = dragStartPosRef.current.y + dy;
    setPos({ x: newX, y: newY });
    if (!appWasDraggedRef.current) {
      appWasDraggedRef.current = true;
      setAppWasDragged(true);
    }
    if (isGrouped) {
      const otherIds = selectedApps.filter((id) => id !== props.app._id);
      setLocalDeltaMove({ x: dx, y: dy }, otherIds);
    }
  }

  function handleDragPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setAppDragging(false);

    if (!appWasDraggedRef.current) return; // tap, no movement

    const x = pos.x;
    const y = pos.y;
    const ddx = x - props.app.data.position.x;
    const ddy = y - props.app.data.position.y;
    const distance = Math.sqrt(ddx * ddx + ddy * ddy);
    if (distance > 50000) {
      toast({
        title: 'Invalid Position',
        description: 'An invalid position was detected. The position was not updated.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setPos({ x: props.app.data.position.x, y: props.app.data.position.y });
      setLocalDeltaMove({ x: 0, y: 0 }, selectedApps);
      return;
    }

    if (isGrouped) {
      updateAppLocationByDelta({ x: ddx, y: ddy }, selectedApps);
      setLocalDeltaMove({ x: 0, y: 0 }, []);
    } else {
      update(props.app._id, { position: { x, y, z: props.app.data.position.z } });
    }
  }

  // ─── Resize handlers ──────────────────────────────────────────────────────

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>, dir: ResizeDirection) {
    if (!canResizeNow) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeActiveRef.current = true;
    resizeDirRef.current = dir;
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: pos.x,
      y: pos.y,
      w: size.width,
      h: size.height,
    };
    setAppDragging(true);
    handleBringAppForward();
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizeActiveRef.current) return;
    const s = scaleRef.current;
    const dir = resizeDirRef.current;
    const start = resizeStartRef.current;

    const rawDx = (e.clientX - start.clientX) / s;
    const rawDy = (e.clientY - start.clientY) / s;

    let newX = start.x;
    let newY = start.y;
    let newW = start.w;
    let newH = start.h;

    // Compute raw new dimensions
    if (dir.includes('e')) newW = Math.max(APP_MIN_WIDTH, Math.min(APP_MAX_WIDTH, start.w + rawDx));
    if (dir.includes('s')) newH = Math.max(APP_MIN_HEIGHT, Math.min(APP_MAX_HEIGHT, start.h + rawDy));
    if (dir.includes('w')) {
      const proposedW = Math.max(APP_MIN_WIDTH, Math.min(APP_MAX_WIDTH, start.w - rawDx));
      newX = start.x + start.w - proposedW;
      newW = proposedW;
    }
    if (dir.includes('n')) {
      const proposedH = Math.max(APP_MIN_HEIGHT, Math.min(APP_MAX_HEIGHT, start.h - rawDy));
      newY = start.y + start.h - proposedH;
      newH = proposedH;
    }

    // Apply aspect ratio lock if needed
    if (aspectRatio !== false) {
      const ratio = typeof aspectRatio === 'number' ? aspectRatio : start.w / start.h;
      // Determine which axis to lock based on drag direction
      const isHorizontal = dir === 'e' || dir === 'w';
      const isVertical = dir === 'n' || dir === 's';
      if (isHorizontal) {
        newH = newW / ratio;
      } else if (isVertical) {
        newW = newH * ratio;
      } else {
        // Corner — use whichever dimension changed more
        if (Math.abs(rawDx) >= Math.abs(rawDy)) {
          newH = newW / ratio;
          if (dir.includes('n')) newY = start.y + start.h - newH;
        } else {
          newW = newH * ratio;
          if (dir.includes('w')) newX = start.x + start.w - newW;
        }
      }
    }

    setPos({ x: newX, y: newY });
    setSize({ width: newW, height: newH });
    setAppWasDragged(true);
  }

  function handleResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizeActiveRef.current) return;
    resizeActiveRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setAppDragging(false);

    update(props.app._id, {
      position: { ...props.app.data.position, x: pos.x, y: pos.y },
      size: { ...props.app.data.size, width: size.width, height: size.height },
    });
  }

  // ─── App click / touch handlers ───────────────────────────────────────────

  async function handleAppClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (primaryActionMode === 'grab' || primaryActionMode === 'linker') return;
    // Shift+click in lasso mode: toggle this app in/out of the lasso selection.
    // Must be checked before appWasDragged — any mouse movement during the click
    // would set appWasDragged and swallow the first click otherwise.
    if (primaryActionMode === 'lasso' && e.shiftKey) {
      setAppWasDragged(false);
      if (isGrouped) {
        removeSelectedApp(props.app._id);
      } else {
        addSelectedApp(props.app._id);
      }
      return;
    }
    if (appWasDragged) {
      setAppWasDragged(false);
      return;
    }
    handleBringAppForward();
    clearSelectedApps();
    setSelectedApp(props.app._id);
  }

  function handleAppTouchStart(e: React.PointerEvent) {
    e.stopPropagation();
    if (primaryActionMode === 'grab' || primaryActionMode === 'linker') return;
    // In lasso mode, shift+click toggle is handled entirely in handleAppClick
    if (primaryActionMode === 'lasso' && e.shiftKey) return;
    if (appWasDragged) {
      setAppWasDragged(false);
    } else {
      handleBringAppForward();
      clearSelectedApps();
      setSelectedApp(props.app._id);
    }
  }

  function handleAppTouchMove(e: React.PointerEvent) {
    e.stopPropagation();
    if (!appWasDragged) setAppWasDragged(true);
  }

  // ─── Double-click on resize handle to snap to viewport ────────────────────

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!canMove || !canResize || isPinned) return;
    if ((e.target as HTMLElement).className === 'app-window-resize-handle') {
      const position = uiToBoard(e.clientX, e.clientY);
      const edge = getRectEdgeAtPoint(
        { x: position.x, y: position.y },
        { x: pos.x, y: pos.y, width: size.width, height: size.height },
        20 * invScale
      );
      if (edge) {
        let newOrigin = { x: pos.x, y: pos.y };
        let newWidth = size.width;
        let newHeight = size.height;
        const padx = 20;
        const pady = 60;
        if (edge.corner) {
          if (edge.corner === 'top-left') {
            newOrigin = uiToBoard(padx, pady);
            newWidth = size.width + (pos.x - newOrigin.x);
            newHeight = size.height + (pos.y - newOrigin.y);
            if (e.altKey) {
              const bottomRight = uiToBoard(window.innerWidth - padx, window.innerHeight - pady);
              newWidth = bottomRight.x - newOrigin.x;
              newHeight = bottomRight.y - newOrigin.y;
            }
          } else if (edge.corner === 'top-right') {
            const topRight = uiToBoard(window.innerWidth - padx, pady);
            newOrigin = { x: pos.x, y: topRight.y };
            newWidth = topRight.x - pos.x;
            newHeight = pos.y + size.height - topRight.y;
            if (e.altKey) {
              const bottomLeft = uiToBoard(padx, window.innerHeight - pady);
              newOrigin = { x: bottomLeft.x, y: topRight.y };
              newWidth = topRight.x - bottomLeft.x;
              newHeight = bottomLeft.y - topRight.y;
            }
          } else if (edge.corner === 'bottom-left') {
            const bottomLeft = uiToBoard(padx, window.innerHeight - pady);
            newOrigin = { x: bottomLeft.x, y: pos.y };
            newWidth = pos.x + size.width - bottomLeft.x;
            newHeight = bottomLeft.y - pos.y;
            if (e.altKey) {
              const topRight = uiToBoard(window.innerWidth - padx, pady);
              newOrigin = { x: bottomLeft.x, y: topRight.y };
              newWidth = topRight.x - bottomLeft.x;
              newHeight = bottomLeft.y - topRight.y;
            }
          } else if (edge.corner === 'bottom-right') {
            const bottomRight = uiToBoard(window.innerWidth - padx, window.innerHeight - pady);
            newWidth = bottomRight.x - pos.x;
            newHeight = bottomRight.y - pos.y;
            if (e.altKey) {
              const topLeft = uiToBoard(padx, pady);
              newOrigin = { x: topLeft.x, y: topLeft.y };
              newWidth = bottomRight.x - topLeft.x;
              newHeight = bottomRight.y - topLeft.y;
            }
          }
        } else if (edge.edge) {
          if (edge.edge === 'left') {
            const topLeft = uiToBoard(padx, pady);
            newOrigin = { x: topLeft.x, y: pos.y };
            newWidth = size.width + (pos.x - topLeft.x);
            newHeight = size.height;
            if (e.altKey) {
              const topRight = uiToBoard(window.innerWidth - padx, pady);
              newWidth = topRight.x - topLeft.x;
            }
          } else if (edge.edge === 'right') {
            const topRight = uiToBoard(window.innerWidth - padx, pady);
            newWidth = topRight.x - pos.x;
            if (e.altKey) {
              const topLeft = uiToBoard(padx, pady);
              newOrigin = { x: topLeft.x, y: pos.y };
              newWidth = topRight.x - topLeft.x;
            }
          } else if (edge.edge === 'top') {
            const topLeft = uiToBoard(padx, pady);
            newOrigin = { x: pos.x, y: topLeft.y };
            newWidth = size.width;
            newHeight = size.height + (pos.y - topLeft.y);
            if (e.altKey) {
              const bottomLeft = uiToBoard(padx, window.innerHeight - pady);
              newHeight = bottomLeft.y - topLeft.y;
            }
          } else if (edge.edge === 'bottom') {
            const bottomLeft = uiToBoard(padx, window.innerHeight - pady);
            newHeight = bottomLeft.y - pos.y;
            if (e.altKey) {
              const topLeft = uiToBoard(padx, pady);
              newOrigin = { x: pos.x, y: topLeft.y };
              newHeight = bottomLeft.y - topLeft.y;
            }
          }
        }
        update(props.app._id, {
          position: { ...props.app.data.position, x: newOrigin.x, y: newOrigin.y },
          size: { ...props.app.data.size, width: newWidth, height: newHeight },
        });
        setSelectedApp('');
      }
    }
  };

  // ─── Outside viewport check ───────────────────────────────────────────────

  const outsideView = useMemo(() => {
    const x = pos.x;
    const y = pos.y;
    const w = size.width;
    const h = size.height;
    const vx = viewport.position.x;
    const vy = viewport.position.y;
    const vw = viewport.size.width;
    const vh = viewport.size.height;
    return x + w < vx || x > vx + vw || y + h < vy || y > vy + vh;
  }, [pos.x, pos.y, size.width, size.height, viewport.position.x, viewport.position.y, viewport.size.width, viewport.size.height]);

  const hideApp = outsideView || boardDragging;
  const hideBackgroundColorHex = useHexColor(props.hideBackgroundColor || backgroundColor);

  const memoizedChildren = useMemo(() => props.children, [props.children]);

  const isFocused = useUIStore((state) => state.focusedAppId === props.app._id);

  return isFocused ? (
    <Portal>
      <Box
        id={'app_' + props.app._id}
        overflow="hidden"
        left="0px"
        top="0px"
        position={'absolute'}
        width="100%"
        height="100%"
        zIndex={999999999}
        background={'backgroundColor'}
      >
        {memoizedChildren}
      </Box>
      <Button
        position="absolute"
        left="50%"
        bottom="0px"
        zIndex={999999999}
        opacity={0.75}
        backgroundColor={backgroundColor}
        _hover={{ backgroundColor: 'teal', opacity: 1, transform: 'scale(1.15)' }}
        color="white"
        onClick={() => {
          useUIStore.getState().setFocusedAppId('');
          if (!showUI) {
            toggleShowUI();
          }
        }}
      >
        Exit
      </Button>
    </Portal>
  ) : (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex: props.lockToBackground ? 0 : myZ,
        pointerEvents: lassoMode || (!canMove && !canResize) ? 'none' : 'auto',
        borderRadius: outerBorderRadius,
        touchAction: 'none',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
      onClick={handleAppClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={handleAppTouchStart}
      onPointerMove={handleAppTouchMove}
    >
      {/* Resize handles — only rendered when selected and resize is enabled */}
      {canResizeNow && selected &&
        RESIZE_DIRECTIONS.map((dir) => (
          <div
            key={dir}
            className="app-window-resize-handle"
            style={getResizeHandleStyle(dir, handlePixelSize)}
            onPointerDown={(e) => handleResizePointerDown(e, dir)}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
        ))}

      {/* Title above app, not when dragging the board */}
      {!boardDragging && <WindowTitle size={size} scale={scale} title={props.app.data.title} selected={selected} />}

      {/* Border Box around app to show it is selected */}
      <WindowBorder
        size={size}
        selected={selected}
        isGrouped={isGrouped}
        dragging={!appDragging && props.app.data.dragging}
        scale={scale}
        borderWidth={borderWidth}
        borderColor={borderColor}
        selectColor={selectColor}
        borderRadius={outerBorderRadius}
        pinned={isPinned}
        background={background}
        isHighlight={isHighlight}
      />

      {/* The Application */}
      <Box
        id={'app_' + props.app._id}
        width="100%"
        height="100%"
        overflow="hidden"
        zIndex={2}
        background={background || outsideView ? backgroundColor : 'unset'}
        borderRadius={innerBorderRadius}
        boxShadow={hideApp || isPinned || !background ? '' : `4px 4px 12px 0px ${shadowColor}}`}
        style={{ contentVisibility: hideApp ? 'hidden' : 'visible' }}
      >
        {memoizedChildren}
      </Box>

      {/* Full-window drag overlay when app is NOT selected */}
      {!selected && (
        <Box
          className="handle"
          position="absolute"
          left="0px"
          top="0px"
          width="100%"
          height="100%"
          cursor={primaryActionMode === 'grab' ? 'grab' : 'move'}
          sx={primaryActionMode === 'grab' ? { '&:active': { cursor: 'grabbing' } } : {}}
          userSelect={'none'}
          zIndex={3}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
        />
      )}

      {/* If the app is being dragged block interaction with the app */}
      {(boardDragging || appDragging || props.app.data.dragging) && <BlockInteraction innerBorderRadius={innerBorderRadius} />}

      {/* Processing Box */}
      {props.processing && (
        <ProcessingBox size={size} selected={selected} colors={{ backgroundColor, selectColor, notSelectColor: borderColor }} />
      )}

      {/* Placeholder when app is outside viewport or board is dragging */}
      {hideApp && (
        <Box
          position="absolute"
          left="0px"
          top="0px"
          width={size.width}
          height={size.height}
          pointerEvents={'none'}
          userSelect={'none'}
          zIndex={999999999}
          justifyContent={'center'}
          alignItems={'center'}
          display={'flex'}
          backgroundColor={hideBackgroundColorHex}
          fontSize={Math.min(size.width, size.height) / 2}
          borderRadius={innerBorderRadius}
          outline={`${borderWidth}px solid ${props.hideBordercolor ? props.hideBordercolor : borderColor}`}
        >
          {props.hideBackgroundIcon ? <Icon as={props.hideBackgroundIcon} /> : <MdWindow />}
        </Box>
      )}
    </div>
  );
}

/**
 * Determines which edge or corner of a rectangle a given point is near, within a specified tolerance.
 */
function getRectEdgeAtPoint(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  tolerance: number = 1
): HitType {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  const nearTopLeft = Math.abs(point.x - left) <= tolerance && Math.abs(point.y - top) <= tolerance;
  const nearTopRight = Math.abs(point.x - right) <= tolerance && Math.abs(point.y - top) <= tolerance;
  const nearBottomLeft = Math.abs(point.x - left) <= tolerance && Math.abs(point.y - bottom) <= tolerance;
  const nearBottomRight = Math.abs(point.x - right) <= tolerance && Math.abs(point.y - bottom) <= tolerance;

  if (nearTopLeft) return { corner: 'top-left' };
  if (nearTopRight) return { corner: 'top-right' };
  if (nearBottomLeft) return { corner: 'bottom-left' };
  if (nearBottomRight) return { corner: 'bottom-right' };

  const withinVerticalRange = point.y >= top - tolerance && point.y <= bottom + tolerance;
  const withinHorizontalRange = point.x >= left - tolerance && point.x <= right + tolerance;

  const onLeft = Math.abs(point.x - left) <= tolerance && withinVerticalRange;
  const onRight = Math.abs(point.x - right) <= tolerance && withinVerticalRange;
  const onTop = Math.abs(point.y - top) <= tolerance && withinHorizontalRange;
  const onBottom = Math.abs(point.y - bottom) <= tolerance && withinHorizontalRange;

  if (onLeft) return { edge: 'left' };
  if (onRight) return { edge: 'right' };
  if (onTop) return { edge: 'top' };
  if (onBottom) return { edge: 'bottom' };

  return null;
}
