/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { DraggableData, Position, ResizableDelta, Rnd } from 'react-rnd';
import { Box, useToast, Text, Avatar, Tooltip, Spinner, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { MdOpenInFull, MdOutlineClose, MdOutlineCloseFullscreen } from 'react-icons/md';

import { App } from '../schema';
import { useAppStore, useUIStore, useUsersStore, initials, useKeyPress, useHotkeys, useHexColor, useAuth } from '@sage3/frontend';

type WindowProps = {
  app: App;
  aspectRatio?: number | boolean;
  children: JSX.Element;
  // React Rnd property to control the window aspect ratio (optional)
  lockAspectRatio?: boolean | number;
  lockToBackground?: boolean;
  processing?: boolean;
};

export function AppWindow(props: WindowProps) {
  // auth
  const { auth } = useAuth();
  const isGuest = auth?.provider === 'guest';

  // UI store for global setting
  const scale = useUIStore((state) => state.scale);
  const zindex = useUIStore((state) => state.zIndex);
  const appTitles = useUIStore((state) => state.showAppTitle);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const appDragging = useUIStore((state) => state.appDragging);
  const setAppDragging = useUIStore((state) => state.setAppDragging);
  const incZ = useUIStore((state) => state.incZ);
  const gridSize = useUIStore((state) => state.gridSize);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const selected = selectedApp === props.app._id;

  // Colors
  const bc = useColorModeValue('gray.200', 'gray.600');
  const borderColor = useHexColor(bc);
  const borderWidth = 4;
  const titleColor = useColorModeValue('gray.800', 'white');
  const selectColor = '#f39e4a';
  const bg = useColorModeValue('gray.100', 'gray.700');
  const backgroundColor = useHexColor(bg);

  // Display messages
  const toast = useToast();

  // Users
  const users = useUsersStore((state) => state.users);
  const owner = users.find((el) => el._id === props.app._createdBy);

  // App Store
  const apps = useAppStore((state) => state.apps);
  const update = useAppStore((state) => state.update);
  const deleteApp = useAppStore((state) => state.delete);
  const storeError = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  // Local state
  const [pos, setPos] = useState({ x: props.app.data.position.x, y: props.app.data.position.y });
  const [size, setSize] = useState({ width: props.app.data.size.width, height: props.app.data.size.height });
  const [minimized, setMinimized] = useState(props.app.data.minimized);
  const [myZ, setMyZ] = useState(zindex);
  const [appWasDragged, setAppWasDragged] = useState(false);

  // Detect if spacebar is held down to allow for board dragging through apps
  const spacebarPressed = useKeyPress(' ');

  // Delete an app while mouseover and delete pressed
  const [mouseOver, setMouseOver] = useState(false);
  useHotkeys(
    'ctrl+d',
    () => {
      if (mouseOver && !selected) {
        deleteApp(props.app._id);
      }
    },
    { dependencies: [mouseOver, selected] }
  );

  // Track the app store errors
  useEffect(() => {
    if (storeError) {
      // Display a message'
      if (storeError.id && storeError.id === props.app._id)
        toast({ description: 'Error - ' + storeError.msg, status: 'warning', duration: 3000, isClosable: true });
      // Clear the error
      clearError();
    }
  }, [storeError]);

  // If size or position change, update the local state.
  useEffect(() => {
    setSize({ width: props.app.data.size.width, height: props.app.data.size.height });
    setPos({ x: props.app.data.position.x, y: props.app.data.position.y });
  }, [props.app.data.size, props.app.data.position]);

  // If minimized change, update the local state.
  useEffect(() => {
    setMinimized(props.app.data.minimized);
  }, [props.app.data.minimized]);

  // Handle when the window starts to drag
  function handleDragStart() {
    setAppDragging(true);
    bringForward();
  }

  // When the window is being dragged
  function handleDrag() {
    setAppWasDragged(true);
  }

  // Handle when the app is finished being dragged
  function handleDragStop(_e: any, data: DraggableData) {
    let x = data.x;
    let y = data.y;
    x = Math.round(x / gridSize) * gridSize; // Snap to grid
    y = Math.round(y / gridSize) * gridSize;
    setPos({ x, y });
    setAppDragging(false);
    update(props.app._id, {
      position: {
        x,
        y,
        z: props.app.data.position.z,
      },
    });
  }

  // Handle when the window starts to resize
  function handleResizeStart() {
    setAppDragging(true);
    bringForward();
  }

  // Handle when the app is resizing
  function handleResize(e: MouseEvent | TouchEvent, _direction: any, ref: any, _delta: ResizableDelta, position: Position) {
    // Get the width and height of the app after the resize
    const width = parseInt(ref.offsetWidth);
    // Subtract the height of the title bar. The title bar is just for the UI, we don't want to save the additional height to the server.
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

  function handleAppClick(e: any) {
    e.stopPropagation();
    bringForward();
    // Set the selected app in the UI store
    if (appWasDragged) setAppWasDragged(false);
    else setSelectedApp(props.app._id);
  }

  // Bring the app forward
  function bringForward() {
    if (!props.lockToBackground) {
      // Raise down
      apps.forEach((a) => {
        if (a.data.raised) update(a._id, { raised: false });
      });
      // Bring to front function
      update(props.app._id, { raised: true });
    }
  }

  return (
    <Rnd
      bounds="parent"
      dragHandleClassName={'handle'}
      size={{ width: size.width, height: size.height }} // Add the height of the titlebar to give the app the full size.
      position={pos}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      onClick={handleAppClick}
      lockAspectRatio={props.lockAspectRatio ? props.lockAspectRatio : false}
      style={{
        boxShadow: `${minimized ? '' : '3px 3px 16px rgba(0,0,0,0.5)'}`,
        backgroundColor: `${minimized ? 'transparent' : backgroundColor}`,
        borderRadius: '6px',
        zIndex: props.lockToBackground ? 0 : myZ,
        pointerEvents: spacebarPressed || isGuest ? 'none' : 'auto', //Guest Blocker
      }}
      // minimum size of the app: 200 px
      minWidth={200}
      minHeight={100}
      // Scaling of the board
      scale={scale}
      // resize and move snapping to grid
      resizeGrid={[gridSize, gridSize]}
      dragGrid={[gridSize, gridSize]}
      // TODO: Make this not required in the future with persmissions system
      // Not ideal but right now we need this to prevent guests from moving apps.
      // This happens locally before updating the server.
      enableResizing={!minimized && !isGuest}
      disableDragging={isGuest}
    >
      {appTitles ? (
        <Box position="absolute" top="0px" left="0px" transform={'translateY(calc(-100% - 6px))'}>
          <Text color={titleColor} fontSize={14 / scale}>
            {props.app.data.description}
          </Text>
        </Box>
      ) : null}

      {/* Border Box around app to show it is selected */}
      <Box
        position="absolute"
        left={`-${borderWidth / scale}px`}
        top={`-${borderWidth / scale}px`}
        width={size.width + (borderWidth / scale) * 2}
        height={size.height + (borderWidth / scale) * 2}
        border={`${borderWidth / scale}px solid ${selected ? selectColor : borderColor}`}
        borderRadius={8 / scale}
        pointerEvents="none"
        zIndex={3}
      ></Box>

      {/* The Application */}
      <Box
        id={'app_' + props.app._id}
        width={size.width}
        height={size.height}
        overflow="hidden"
        zIndex={2}
        display={minimized ? 'none' : 'inherit'}
        borderRadius={8 / scale}
        background={borderColor}
      >
        {props.children}
      </Box>
      {/* This div is to allow users to drag anywhere within the window when the app isnt selected*/}
      {!selected ? (
        <Box
          position="absolute"
          className="handle" // The CSS name react-rnd latches on to for the drag events
          left="0px"
          top="0px"
          width={size.width}
          height={minimized ? 0 + 'px' : size.height + 'px'}
          cursor="move"
          userSelect={'none'}
          zIndex={3}
          onMouseEnter={() => {
            setMouseOver(true);
          }}
          onMouseLeave={() => {
            setMouseOver(false);
          }}
        ></Box>
      ) : null}

      {/* This div is to block the app from being interacted with when the user is dragging the board or an app */}
      {boardDragging || appDragging ? (
        <Box
          position="absolute"
          left="0px"
          top="0px"
          width={size.width}
          height={minimized ? 0 + 'px' : size.height + 'px'}
          pointerEvents={'none'}
          userSelect={'none'}
          zIndex={999999999} // Really big number to just force it to be on top
        ></Box>
      ) : null}
      {/* Processing Box */}
      {props.processing ? (
        <Box
          position="absolute"
          left="0px"
          top="0px"
          width={size.width}
          height={minimized ? 0 + 'px' : size.height + 'px'}
          pointerEvents={'none'}
          userSelect={'none'}
          zIndex={999999}
          display="flex"
          justifyContent="center"
          alignItems="center"
          backgroundColor={backgroundColor}
        >
          <Box transform={`scale(${4 * Math.min(size.width / 300, size.height / 300)})`}>
            <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color={selected ? selectColor : 'teal'} size="xl" />
          </Box>
        </Box>
      ) : null}
    </Rnd>
  );
}
