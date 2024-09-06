/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useState } from 'react';
import { Box, useToast, useColorModeValue, Icon } from '@chakra-ui/react';
import { DraggableData, ResizableDelta, Position, Rnd, RndDragEvent } from 'react-rnd';
import { MdWindow } from 'react-icons/md';
import { IconType } from 'react-icons/lib';

import { useAppStore, useUIStore, useKeyPress, useHexColor, useThrottleScale, useAbility, useInsightStore } from '@sage3/frontend';

// Window Components
import { ProcessingBox, BlockInteraction, WindowTitle, WindowBorder } from './components';
import { App } from '../../schema';

// Consraints on the app window size
const APP_MIN_WIDTH = 200;
const APP_MIN_HEIGHT = 100;
const APP_MAX_WIDTH = 8 * 1024;
const APP_MAX_HEIGHT = 8 * 1024;

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
  const boardSynced = useUIStore((state) => state.boardSynced)
  const rndSafeToAction = useUIStore((state) => state.rndSafeToAction)

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

  // Detect if spacebar is held down to allow for board dragging through apps
  const spacebarPressed = useKeyPress(' ');

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
      update(props.app._id, { position: { x, y, z: props.app.data.position.z, } });
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

  function handleAppClick(e: MouseEvent) {
    e.stopPropagation();
    handleBringAppForward();
    // Set the selected app in the UI store
    if (appWasDragged) setAppWasDragged(false);
    else {
      clearSelectedApps();
      setSelectedApp(props.app._id);
    }
  }

  function handleAppTouchStart(e: PointerEvent) {
    e.stopPropagation();
    handleBringAppForward();
    // Set the selected app in the UI store
    if (appWasDragged) {
      setAppWasDragged(false);
    } else {
      clearSelectedApps();
      setSelectedApp(props.app._id);
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

  return (
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
      // select an app on touch
      onPointerDown={handleAppTouchStart}
      onPointerMove={handleAppTouchMove}
      // enableResizing={enableResize && canResize && !isPinned}
      enableResizing={enableResize && canResize && !isPinned && (selectedApp !== "")} // || selectedApps.length > 0) Temporary solution to fix resize while drag, selectedApps.length !== 0 || 

      // !boardSync is a temporary solution to prevent the most common type of bug which is zooming followed by a click
      disableDragging={!canMove || isPinned || !(boardSynced && rndSafeToAction)}
      lockAspectRatio={props.lockAspectRatio ? props.lockAspectRatio : false}
      style={{
        zIndex: props.lockToBackground ? 0 : myZ,
        pointerEvents: spacebarPressed || lassoMode || (!canMove && !canResize) ? 'none' : 'auto',
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
        boxShadow={hideApp || isPinned || !background ? '' : `4px 4px 12px 0px ${shadowColor}`}
        style={{ contentVisibility: hideApp ? 'hidden' : 'visible' }}
      >
        {props.children}
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
          cursor="move"
          userSelect={'none'}
          zIndex={3}
          borderRadius={innerBorderRadius}
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
