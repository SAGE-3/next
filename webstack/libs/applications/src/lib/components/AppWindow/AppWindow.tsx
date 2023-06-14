/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useCallback } from 'react';
import { Box, useToast, useColorModeValue } from '@chakra-ui/react';

import { DraggableData, Position, ResizableDelta, Rnd, RndDragEvent } from 'react-rnd';
// Just to get the type
import { ResizeDirection } from 're-resizable';
// Slowdown the events
import { throttle } from 'throttle-debounce';

import { useAppStore, useUIStore, useKeyPress, useHexColor } from '@sage3/frontend';
import { App, AppSchema } from '../../schema';

// Window Components
import { ProcessingBox, BlockInteraction, WindowBorder, WindowTitle } from './components';

// Time in ms to send updates to the server
const UpdateRate = 1000 / 3;

type WindowProps = {
  app: App;
  children: JSX.Element;
  // React Rnd property to control the window aspect ratio (optional)
  lockAspectRatio?: boolean | number;
  lockToBackground?: boolean;
  processing?: boolean;
  disableResize?: boolean;
};

export function AppWindow(props: WindowProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const update = useAppStore((state) => state.update);
  const updateBatch = useAppStore((state) => state.updateBatch);

  // Error Display Handling
  const storeError = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  // UI store for global setting
  const scale = useUIStore((state) => state.scale);
  const zindex = useUIStore((state) => state.zIndex);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const appDragging = useUIStore((state) => state.appDragging);
  const setAppDragging = useUIStore((state) => state.setAppDragging);
  const incZ = useUIStore((state) => state.incZ);
  const gridSize = useUIStore((state) => state.gridSize);

  // Selected Apps Info
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const setSelectedAppsSnapshot = useUIStore((state) => state.setSelectedAppSnapshot);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const selected = selectedApp === props.app._id;
  const selectedApps = useUIStore((state) => state.selectedAppsIds);
  const isGrouped = selectedApps.includes(props.app._id);
  const selectedAppsSnapshot = useUIStore((state) => state.selectedAppsSnapshot);
  const [groupedAppsStart, setGroupedAppsStart] = useState<{ [id: string]: Position }>({});

  const lassoMode = useUIStore((state) => state.lassoMode);
  const deltaPosition = useUIStore((state) => state.deltaPos);
  const setDeltaPosition = useUIStore((state) => state.setDeltaPostion);

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

  // Border Radius (https://www.30secondsofcode.org/articles/s/css-nested-border-radius)
  const borderWidth = Math.min(Math.max(4 / scale, 1), selected ? 10 : 4);
  const outerBorderRadius = 12;
  const innerBorderRadius = outerBorderRadius - borderWidth;

  // Resize Handle scale
  const enableResize = props.disableResize === undefined ? true : !props.disableResize;
  const handleScale = Math.max(1, 1 / scale);

  // Display messages
  const toast = useToast();
  const toastID = 'error-toast';

  // Detect if spacebar is held down to allow for board dragging through apps
  const spacebarPressed = useKeyPress(' ');

  // Group Delta Change
  useEffect(() => {
    if (isGrouped) {
      if (selectedApps.includes(props.app._id) && props.app._id != deltaPosition.id) {
        const x = selectedAppsSnapshot[props.app._id].x + deltaPosition.p.x;
        const y = selectedAppsSnapshot[props.app._id].y + deltaPosition.p.y;
        setPos({ x, y });
      }
    }
  }, [deltaPosition, selectedAppsSnapshot]);

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
    if (!selectedApps.includes(props.app._id) && !selected) {
      setSize({ width: props.app.data.size.width, height: props.app.data.size.height });
      setPos({ x: props.app.data.position.x, y: props.app.data.position.y });
    }
  }, [props.app.data.size, props.app.data.position, selectedApps]);

  // Throttle the position update
  const throttlePositionUpdate = throttle(UpdateRate, (x: number, y: number) => {
    update(props.app._id, { position: { x, y, z: props.app.data.position.z } });
  });
  const updatePositionFunc = useCallback(throttlePositionUpdate, []);

  // Update the position of the grouped windows
  const throttleGroupPositionUpdate = throttle(UpdateRate, (dx: number, dy: number) => {
    const updates = [] as { id: string; updates: Partial<AppSchema> }[];
    for (const appId of selectedApps) {
      const app = apps.find((el) => el._id == appId);
      const startPos = groupedAppsStart[appId];
      if (app && startPos) {
        updates.push({
          id: appId,
          updates: {
            position: {
              x: startPos.x + dx,
              y: startPos.y + dy,
              z: app.data.position.z,
            },
          },
        });
      }
    }
    updateBatch(updates);
  });

  const updateGroupPositionFunc = useCallback(throttleGroupPositionUpdate, [groupedAppsStart, selectedApps]);

  // Handle when the window starts to drag
  function handleDragStart() {
    setAppDragging(true);
    bringForward();
    setDeltaPosition({ x: 0, y: 0, z: 0 }, props.app._id);

    if (isGrouped) {
      const updates = [] as { id: string; updates: Partial<AppSchema> }[];
      const groupedAppsStart = {} as { [id: string]: { x: number; y: number; z: number } };
      for (const appId of selectedApps) {
        const app = apps.find((el) => el._id == appId);
        if (app) {
          updates.push({ id: appId, updates: { dragging: true } });
          groupedAppsStart[appId] = { x: app.data.position.x, y: app.data.position.y, z: app.data.position.z };
        }
        setGroupedAppsStart(groupedAppsStart);
        setSelectedAppsSnapshot(groupedAppsStart);
        updateBatch(updates);
      }
    } else {
      update(props.app._id, { dragging: true });
    }
  }

  // When the window is being dragged
  function handleDrag(_e: RndDragEvent, data: DraggableData) {
    setAppWasDragged(true);
    if (isGrouped) {
      const dx = data.x - groupedAppsStart[props.app._id].x;
      const dy = data.y - groupedAppsStart[props.app._id].y;
      setDeltaPosition({ x: dx, y: dy, z: 0 }, props.app._id);
      updateGroupPositionFunc(dx, dy);
    } else {
      updatePositionFunc(data.x, data.y);
    }
    setPos({ x: data.x, y: data.y });
  }

  // Handle when the app is finished being dragged
  function handleDragStop(_e: RndDragEvent, data: DraggableData) {
    const x = Math.round(data.x / gridSize) * gridSize;
    const y = Math.round(data.y / gridSize) * gridSize;
    setPos({ x, y });
    setAppDragging(false);
    if (isGrouped) {
      const updates = [] as { id: string; updates: Partial<AppSchema> }[];
      for (const appId of selectedApps) {
        const app = apps.find((el) => el._id == appId);
        const startPos = groupedAppsStart[appId];
        if (app && startPos) {
          updates.push({
            id: appId,
            updates: {
              dragging: false,
            },
          });
        }
      }
      setGroupedAppsStart({});
      updateBatch(updates);
    } else {
      update(props.app._id, {
        dragging: false,
        position: { x, y, z: props.app.data.position.z },
      });
    }
  }

  // Throttle the size update
  const throttleSizeUpdate = throttle(UpdateRate, (width: number, height: number, position: Position) => {
    update(props.app._id, {
      position: { ...props.app.data.position, x: position.x, y: position.y },
      size: { ...props.app.data.size, width, height },
    });
  });
  const updateSizeFunc = useCallback(throttleSizeUpdate, []);

  // Handle when the window starts to resize
  function handleResizeStart() {
    setAppDragging(true);
    bringForward();
    update(props.app._id, { dragging: true });
  }

  // Handle when the app is resizing
  function handleResize(
    e: MouseEvent | TouchEvent,
    _direction: ResizeDirection,
    ref: HTMLElement,
    _delta: ResizableDelta,
    position: Position
  ) {
    // Get the width and height of the app after the resize
    const width = ref.offsetWidth;
    const height = ref.offsetHeight;
    // Set local state
    setSize({ width, height });
    setAppWasDragged(true);
    setPos({ x: position.x, y: position.y });
    updateSizeFunc(width, height, position);
  }

  // Handle when the app is fnished being resized
  function handleResizeStop(
    e: MouseEvent | TouchEvent,
    _direction: ResizeDirection,
    ref: HTMLElement,
    _delta: ResizableDelta,
    position: Position
  ) {
    // Get the width and height of the app after the resize
    const width = ref.offsetWidth;
    // Subtract the height of the title bar.
    // The title bar is just for the UI, we don't want to save the additional height to the server.
    const height = ref.offsetHeight;

    // Set local state
    setPos({ x: position.x, y: position.y });
    setSize({ width, height });
    setAppDragging(false);

    // Update the size and position of the app in the server
    update(props.app._id, {
      dragging: false,
      position: { ...props.app.data.position, x: position.x, y: position.y },
      size: { ...props.app.data.size, width, height },
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
    bringForward();
    // Set the selected app in the UI store
    if (appWasDragged) setAppWasDragged(false);
    else {
      clearSelectedApps();
      setSelectedApp(props.app._id);
    }
  }

  // Bring the app forward
  function bringForward() {
    if (!props.lockToBackground) {
      // Raise down all the other apps, if needed
      apps.forEach((a) => {
        if (a.data.raised && props.app._id !== a._id) update(a._id, { raised: false });
      });
      // Bring to front function
      if (!props.app.data.raised) update(props.app._id, { raised: true });
    }
  }

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
      enableResizing={enableResize}
      lockAspectRatio={props.lockAspectRatio ? props.lockAspectRatio : false}
      style={{
        zIndex: props.lockToBackground ? 0 : myZ,
        pointerEvents: spacebarPressed || lassoMode ? 'none' : 'auto',
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
      // minimum size of the app: 200 px
      minWidth={200}
      minHeight={100}
      // Scaling of the board
      scale={scale}
      // resize and move snapping to grid
      resizeGrid={[gridSize, gridSize]}
      dragGrid={[gridSize, gridSize]}
      disableDragging={false}
    >
      {/* Title Above app */}
      <WindowTitle size={size} scale={scale} title={props.app.data.title} />

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
      />

      {/* The Application */}
      <Box
        id={'app_' + props.app._id}
        width="100%"
        height="100%"
        overflow="hidden"
        zIndex={2}
        background={backgroundColor}
        borderRadius={innerBorderRadius}
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
    </Rnd>
  );
}
