/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useState } from 'react';
import { Box, useToast, useColorModeValue, Icon, Text, Portal, Button } from '@chakra-ui/react';

import { DraggableData, ResizableDelta, Position, Rnd, RndDragEvent } from 'react-rnd';
import { MdWindow } from 'react-icons/md';
import { IconType } from 'react-icons/lib';

// SAGE3 Frontend
import { useAppStore, useUIStore, useHexColor, useThrottleScale, useAbility, useInsightStore, useUserSettings, useUIToBoard } from '@sage3/frontend';

// Window Components
import { App } from '../../schema';
import { ProcessingBox, BlockInteraction, WindowTitle, WindowBorder } from './components';

// Consraints on the app window size
const APP_MIN_WIDTH = 200;
const APP_MIN_HEIGHT = 100;
const APP_MAX_WIDTH = 8 * 1024;
const APP_MAX_HEIGHT = 8 * 1024;

// Window borders
type Side = "left" | "right" | "top" | "bottom";
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type HitType = { edge?: Side; corner?: Corner } | null;


type WindowProps = {
  app: App;
  children: JSX.Element;
  // React Rnd property to control the window aspect ratio (optional)
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
  const scale = useThrottleScale(250);
  const zindex = useUIStore((state) => state.zIndex);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const appDragging = useUIStore((state) => state.appDragging);
  const setAppDragging = useUIStore((state) => state.setAppDragging);
  const incZ = useUIStore((state) => state.incZ);
  const viewport = useUIStore((state) => state.viewport);
  const selectedTag = useUIStore((state) => state.selectedTag);
  const localDeltaMove = useUIStore((state) => state.deltaLocalMove[props.app._id]);
  const setLocalDeltaMove = useUIStore((state) => state.setDeltaLocalMove);
  const boardSynced = useUIStore((state) => state.boardSynced);
  const rndSafeForAction = useUIStore((state) => state.rndSafeForAction);
  const uiToBoard = useUIToBoard();

  // Selected Apps Info
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const selected = selectedApp === props.app._id;
  const selectedApps = useUIStore((state) => state.selectedAppsIds);

  // Tag Highlight
  // Insight Store
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

  // Colors and Styling
  const bg = useColorModeValue('gray.100', 'gray.700');
  const backgroundColor = useHexColor(bg);
  const bc = useColorModeValue('gray.300', 'gray.600');
  const borderColor = useHexColor(bc);
  const selectColor = useHexColor('teal');
  const shadowColor = useColorModeValue('rgba(0 0 0 / 25%)', 'rgba(0 0 0 / 50%)');

  // Border Radius (https://www.30secondsofcode.org/articles/s/css-nested-border-radius)
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
  const handleScale = Math.max(2, Math.min(invScale, 10));

  // Display messages
  const toast = useToast();
  const toastID = 'error-toast';

  // Track the app store errors
  useEffect(() => {
    if (storeError) {
      // Display a message'
      if (storeError.id && storeError.id === props.app._id) {
        // open new toast if the previous one is not active
        if (!toast.isActive(toastID)) {
          toast({ id: toastID, description: 'Error - ' + storeError.msg, status: 'warning', duration: 3000, isClosable: true });
        } else {
          // or update the existing one
          toast.update(toastID, { description: 'Error - ' + storeError.msg, status: 'warning', duration: 3000, isClosable: true });
        }
      }
      // Clear the error
      clearError();
    }
  }, [storeError]);

  // If size or position change, update the local state.
  useEffect(() => {
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

  // Handle when the window starts to drag
  function handleDragStart() {
    setAppDragging(true);
    setAppWasDragged(false);
    handleBringAppForward();
    if (isGrouped) {
      const selectedAppIds = selectedApps.filter((appId) => appId !== props.app._id);
      setLocalDeltaMove({ x: 0, y: 0 }, selectedAppIds);
    }
  }

  // When the window is being dragged
  function handleDrag(_e: RndDragEvent, data: DraggableData) {
    if (!appWasDragged) {
      setAppWasDragged(true);
    }
    if (isGrouped) {
      const dx = data.x - props.app.data.position.x;
      const dy = data.y - props.app.data.position.y;
      const selectedAppIds = selectedApps.filter((appId) => appId !== props.app._id);
      setLocalDeltaMove({ x: dx, y: dy }, selectedAppIds);
    }
  }

  // Handle when the app is finished being dragged
  function handleDragStop(_e: RndDragEvent, data: DraggableData) {
    const x = data.x;
    const y = data.y;
    setPos({ x, y });
    setAppDragging(false);
    // Update the position of the app in the server and all the other apps in the group
    if (isGrouped) {
      const dx = data.x - props.app.data.position.x;
      const dy = data.y - props.app.data.position.y;
      updateAppLocationByDelta({ x: dx, y: dy }, selectedApps);
      setLocalDeltaMove({ x: 0, y: 0 }, []);
    } else {
      update(props.app._id, { position: { x, y, z: props.app.data.position.z } });
    }
  }

  // Handle when the window starts to resize
  function handleResizeStart() {
    setAppDragging(true);
    handleBringAppForward();
  }

  // Handle when the app is resizing
  function handleResize(e: MouseEvent | TouchEvent, _direction: any, ref: any, _delta: ResizableDelta, position: Position) {
    // Get the width and height of the app after the resize
    const width = parseInt(ref.offsetWidth);
    const height = parseInt(ref.offsetHeight);

    // Set local state
    setSize({ width, height });
    setAppWasDragged(true);
    setPos({ x: position.x, y: position.y });
  }

  // Handle when the app is fnished being resized
  function handleResizeStop(e: MouseEvent | TouchEvent, _direction: any, ref: any, _delta: ResizableDelta, position: Position) {
    // Get the width and height of the app after the resize
    const width = parseInt(ref.offsetWidth);
    // Subtract the height of the title bar. The title bar is just for the UI, we don't want to save the additional height to the server.
    const height = parseInt(ref.offsetHeight);

    // Set local state
    setPos({ x: position.x, y: position.y });
    setSize({ width, height });
    setAppDragging(false);

    // Update the size and position of the app in the server
    update(props.app._id, {
      position: {
        ...props.app.data.position,
        x: position.x,
        y: position.y,
      },
      size: {
        ...props.app.data.size,
        width,
        height,
      },
    });
  }

  // Track raised state
  useEffect(() => {
    if (props.app.data.raised) {
      if (!props.lockToBackground) {
        // raise  my zIndex
        setMyZ(zindex + 1);
        // raise the global value
        incZ();
      }
    }
  }, [props.app.data.raised]);

  async function handleAppClick(e: MouseEvent) {
    e.stopPropagation();

    if (primaryActionMode === 'grab') {
      return;
    }
    if (primaryActionMode === 'linker') {
      return;
    }
    // Set the selected app in the UI store
    if (appWasDragged) setAppWasDragged(false);
    else {
      handleBringAppForward();
      clearSelectedApps();
      setSelectedApp(props.app._id);
      // // Uncomment to allow for selection in grab mode to change interaction modes
      // if (primaryActionMode === 'grab') {
      //   setPrimaryActionMode('lasso');
      // }
    }
  }

  function handleAppTouchStart(e: PointerEvent) {
    e.stopPropagation();

    // Uncomment me to block selection behaviour on AppWindows
    if (primaryActionMode === 'grab') {
      return;
    }

    if (primaryActionMode === 'linker') {
      return;
    }

    // Set the selected app in the UI store
    if (appWasDragged) {
      setAppWasDragged(false);
    } else {
      handleBringAppForward();
      clearSelectedApps();
      setSelectedApp(props.app._id);
      // // Uncomment to allow for selection in grab mode to change interaction modes
      // if (primaryActionMode === 'grab') {
      //   setPrimaryActionMode('lasso');
      // }
    }
  }

  function handleAppTouchMove(e: PointerEvent) {
    e.stopPropagation();
    setAppWasDragged(true);
  }

  function handleBringAppForward() {
    bringForward(props.app._id);
  }

  useEffect(() => {
    // Check if the app has the pinned property
    if (props.app.data.pinned === undefined) {
      update(props.app._id, { pinned: false });
    }
    // When closing the app, deselect it
    return () => {
      if (selectedApp === props.app._id) {
        setSelectedApp('');
      }
    };
  }, [selectedApp]);

  // Caclulate if the app is within the user's Viewport
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

  // Handle double click on the app window borders
  // This will resize the app window to the size of the viewport
  // If Alt is pressed, it will resize also in the opposite direction
  const onDoubleClick = (e: any) => {
    // If not allowed to resize, return
    if (!canMove || !canResize || isPinned) {
      return;
    }
    // If clicked on the resize handle...
    if (e.target.className === 'app-window-resize-handle') {
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
        // Check if the edge is a corner
        if (edge.corner) {
          // Handle corner double click
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
          }
          else if (edge.corner === 'bottom-left') {
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
          }
          else if (edge.corner === 'bottom-right') {
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
            // Handle left edge double click
            const topLeft = uiToBoard(padx, pady);
            newOrigin = { x: topLeft.x, y: pos.y };
            newWidth = size.width + (pos.x - topLeft.x);
            newHeight = size.height;
            if (e.altKey) {
              const topRight = uiToBoard(window.innerWidth - padx, pady);
              newWidth = topRight.x - topLeft.x;
            }
          }
          else if (edge.edge === 'right') {
            // Handle right edge double click
            const topRight = uiToBoard(window.innerWidth - padx, pady);
            newWidth = topRight.x - pos.x;
            if (e.altKey) {
              const topLeft = uiToBoard(padx, pady);
              newOrigin = { x: topLeft.x, y: pos.y };
              newWidth = topRight.x - topLeft.x;
            }
          }
          else if (edge.edge === 'top') {
            // Handle top edge double click
            const topLeft = uiToBoard(padx, pady);
            newOrigin = { x: pos.x, y: topLeft.y };
            newWidth = size.width;
            newHeight = size.height + (pos.y - topLeft.y);
            if (e.altKey) {
              const bottomLeft = uiToBoard(padx, window.innerHeight - pady);
              newHeight = bottomLeft.y - topLeft.y;
            }
          }
          else if (edge.edge === 'bottom') {
            // Handle bottom edge double click
            const bottomLeft = uiToBoard(padx, window.innerHeight - pady);
            newHeight = bottomLeft.y - pos.y;
            if (e.altKey) {
              const topLeft = uiToBoard(padx, pady);
              newOrigin = { x: pos.x, y: topLeft.y };
              newHeight = bottomLeft.y - topLeft.y;
            }
          }
        }
        // Update the app size and position
        update(props.app._id, {
          position: {
            ...props.app.data.position, x: newOrigin.x, y: newOrigin.y
          },
          size: {
            ...props.app.data.size,
            width: newWidth, height: newHeight
          },
        });
        // Deselect the app
        setSelectedApp('');
      }
    }
  };

  const focusedAppId = useUIStore((state) => state.focusedAppId);

  return (
    focusedAppId === props.app._id ?
      <Portal >
        <Box
          id={'app_' + props.app._id}
          overflow="hidden"
          left="0px"
          top="0px"
          position={'absolute'}
          width="100%"
          height="100%"
          zIndex={999999999}
          background={backgroundColor}
        >
          {/* {props.children} */}
          {memoizedChildren}
          {/* <Text fontSize="2xl" color="white">
            {props.app.data.title}
          </Text> */}
        </Box>
        <Button
          position="absolute"
          left="50%"
          bottom="0px"
          zIndex={999999999}
          backgroundColor={backgroundColor}
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
      :
      <Rnd
        bounds="parent"
        dragHandleClassName="handle"
        size={{ width: size.width, height: size.height }}
        position={pos}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        onClick={handleAppClick}
        // Handle double click on the app window borders
        onDoubleClick={onDoubleClick}
        // Select an app on touch
        onPointerDown={handleAppTouchStart}
        onPointerMove={handleAppTouchMove}
        // EnableResizing={enableResize && canResize && !isPinned}
        enableResizing={enableResize && canResize && !isPinned && primaryActionMode === 'lasso'} // Temporary solution to fix resize while drag -> && (selectedApp !== "")
        // BoardSync && rndSafeForAction is a temporary solution to prevent the most common type of bug which is zooming followed by a click
        disableDragging={
          !canMove || isPinned || !(boardSynced && rndSafeForAction) || primaryActionMode === 'grab' || primaryActionMode === 'linker'
        }
        lockAspectRatio={props.lockAspectRatio ? props.lockAspectRatio : false}
        style={{
          zIndex: props.lockToBackground ? 0 : myZ,
          pointerEvents: lassoMode || (!canMove && !canResize) ? 'none' : 'auto',
          borderRadius: outerBorderRadius, // This is used to prevent selection at very edge of corner in grab mode
          touchAction: 'none', // needed to prevent pinch to zoom
        }}
        resizeHandleStyles={{
          bottom: { transform: `scaleY(${handleScale})` },
          bottomLeft: { transform: `scale(${handleScale})` },
          bottomRight: { transform: `scale(${handleScale})` },
          left: { transform: `scaleX(${handleScale})` },
          right: { transform: `scaleX(${handleScale})` },
          top: { transform: `scaleY(${handleScale})` },
          topLeft: { transform: `scale(${handleScale})` },
          topRight: { transform: `scale(${handleScale})` },
        }}
        resizeHandleClasses={{
          bottom: 'app-window-resize-handle',
          bottomLeft: 'app-window-resize-handle',
          bottomRight: 'app-window-resize-handle',
          left: 'app-window-resize-handle',
          right: 'app-window-resize-handle',
          top: 'app-window-resize-handle',
          topLeft: 'app-window-resize-handle',
          topRight: 'app-window-resize-handle',
        }}
        // min/max app window dimensions
        minWidth={APP_MIN_WIDTH}
        minHeight={APP_MIN_HEIGHT}
        maxWidth={APP_MAX_WIDTH}
        maxHeight={APP_MAX_HEIGHT}
        // Scaling of the board
        scale={scale}
      >
        {/* Title Above app, not when dragging the board */}
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
          selectColor={props.app.data.state?.msgId ? '#F69637' : selectColor} // Orange for SageCell when running
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
          boxShadow={hideApp || isPinned || !background ? '' : `4px 4px 12px 0px ${shadowColor}`} //|| primaryActionMode === 'grab'
          style={{ contentVisibility: hideApp ? 'hidden' : 'visible' }}
        >
          {memoizedChildren}
        </Box>

        {/* This div is to allow users to drag anywhere within the window when the app isnt selected*/}
        {!selected && (
          <Box
            className="handle" // The CSS name react-rnd latches on to for the drag events
            position="absolute"
            left="0px"
            top="0px"
            width="100%"
            height="100%"
            cursor={primaryActionMode === 'grab' ? 'grab' : 'move'}
            sx={
              primaryActionMode === 'grab'
                ? {
                  '&:active': {
                    cursor: 'grabbing',
                  },
                }
                : {}
            }
            userSelect={'none'}
            zIndex={3}
          // borderRadius={innerBorderRadius}
          ></Box>
        )}

        {/* If the app is being dragged block interaction with the app */}
        {(boardDragging || appDragging || props.app.data.dragging) && <BlockInteraction innerBorderRadius={innerBorderRadius} />}

        {/* Processing Box */}
        {props.processing && (
          <ProcessingBox size={size} selected={selected} colors={{ backgroundColor, selectColor, notSelectColor: borderColor }} />
        )}

        {/* Icon when app is dragging */}
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
      </Rnd>
  );
}


/**
 * Determines which edge or corner of a rectangle a given point is near, within a specified tolerance.
 *
 * @param point - The point to check, with x and y coordinates.
 * @param rect - The rectangle to check against, with x, y, width, and height properties.
 * @param tolerance - The distance within which the point is considered near an edge or corner (default is 1).
 * @returns An object indicating the edge or corner the point is near, or null if the point is not near any edge or corner.
 */
function getRectEdgeAtPoint(
  point: { x: number, y: number },
  rect: { x: number, y: number, width: number, height: number },
  tolerance: number = 1
): HitType {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  // Check if the point is near any of the rectangle's corners
  const nearTopLeft = Math.abs(point.x - left) <= tolerance && Math.abs(point.y - top) <= tolerance;
  const nearTopRight = Math.abs(point.x - right) <= tolerance && Math.abs(point.y - top) <= tolerance;
  const nearBottomLeft = Math.abs(point.x - left) <= tolerance && Math.abs(point.y - bottom) <= tolerance;
  const nearBottomRight = Math.abs(point.x - right) <= tolerance && Math.abs(point.y - bottom) <= tolerance;

  if (nearTopLeft) return { corner: "top-left" };
  if (nearTopRight) return { corner: "top-right" };
  if (nearBottomLeft) return { corner: "bottom-left" };
  if (nearBottomRight) return { corner: "bottom-right" };

  // Edges
  const withinVerticalRange = point.y >= top - tolerance && point.y <= bottom + tolerance;
  const withinHorizontalRange = point.x >= left - tolerance && point.x <= right + tolerance;

  const onLeft = Math.abs(point.x - left) <= tolerance && withinVerticalRange;
  const onRight = Math.abs(point.x - right) <= tolerance && withinVerticalRange;
  const onTop = Math.abs(point.y - top) <= tolerance && withinHorizontalRange;
  const onBottom = Math.abs(point.y - bottom) <= tolerance && withinHorizontalRange;

  if (onLeft) return { edge: "left" };
  if (onRight) return { edge: "right" };
  if (onTop) return { edge: "top" };
  if (onBottom) return { edge: "bottom" };

  return null;
}
