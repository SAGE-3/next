/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import { DraggableData, Position, ResizableDelta, Rnd, RndDragEvent } from 'react-rnd';
import { Box, useToast, Text, Spinner, useColorModeValue } from '@chakra-ui/react';

import { App } from '../schema';
import { useAppStore, useUIStore, useKeyPress, useHexColor, useAuth, useUser } from '@sage3/frontend';

type WindowProps = {
  app: App;
  children: JSX.Element;
  // React Rnd property to control the window aspect ratio (optional)
  lockAspectRatio?: boolean | number;
  lockToBackground?: boolean;
  processing?: boolean;
};

export function AppWindow(props: WindowProps) {
  // Guest mode disabled for now
  const { auth } = useAuth();

  const [isGuest, setIsGuest] = useState(true);
  // Are you a guest?
  useEffect(() => {
    if (auth) {
      setIsGuest(auth.provider === 'guest');
    }
  }, [auth]);

  // Ref to the app container
  const divRef = useRef<HTMLDivElement>(null);

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
  const selectedApps = useUIStore((state) => state.selectedApps);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const isGrouped = selectedApps.includes(props.app._id);
  const lassoMode = useUIStore((state) => state.lassoMode);
  const deltaPosition = useUIStore((state) => state.deltaPos);
  const setDeltaPosition = useUIStore((state) => state.setDeltaPostion);

  // Local state
  const [pos, setPos] = useState({ x: props.app.data.position.x, y: props.app.data.position.y });
  const [size, setSize] = useState({ width: props.app.data.size.width, height: props.app.data.size.height });
  const [myZ, setMyZ] = useState(zindex);
  const [appWasDragged, setAppWasDragged] = useState(false);
  const [dragStatePos, setDragStartPosition] = useState(props.app.data.position);

  // Colors
  const bg = useColorModeValue('gray.100', 'gray.700');
  const backgroundColor = useHexColor(bg);

  const bc = useColorModeValue('gray.300', 'gray.600');
  const borderColor = useHexColor(bc);
  // const borderColorGroupSelect = useHexColor('gray');

  const titleBackground = useColorModeValue('#00000000', '#ffffff26');
  const titleBrightness = useColorModeValue('85%', '65%');
  const borderWidth = Math.min(Math.max(4 / scale, 2), 20);
  // Border Radius (https://www.30secondsofcode.org/articles/s/css-nested-border-radius)
  const outerBorderRadius = 12;
  const innerBorderRadius = outerBorderRadius - borderWidth;
  const titleColor = useColorModeValue('white', 'white');
  const selectColor = useHexColor('teal');

  // Resize Handle scale
  const handleScale = Math.max(1, 1 / scale);

  // Display messages
  const toast = useToast();

  // App Store
  const apps = useAppStore((state) => state.apps);
  const update = useAppStore((state) => state.update);
  const storeError = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  // Detect if spacebar is held down to allow for board dragging through apps
  const spacebarPressed = useKeyPress(' ');

  // Group Delta Change
  useEffect(() => {
    if (isGrouped) {
      if (selectedApps.includes(props.app._id) && props.app._id != deltaPosition.id) {
        const x = props.app.data.position.x + deltaPosition.p.x;
        const y = props.app.data.position.y + deltaPosition.p.y;
        setPos({ x, y });
      }
    }
  }, [deltaPosition]);

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

  // Handle when the window starts to drag
  function handleDragStart() {
    // Trying to optimize performance
    if (divRef.current) {
      // divRef.current.style.willChange = 'transform';
    }
    setAppDragging(true);
    bringForward();
    setDragStartPosition(props.app.data.position);
    setDeltaPosition({ x: 0, y: 0, z: 0 }, props.app._id);
  }

  // When the window is being dragged
  function handleDrag(_e: RndDragEvent, data: DraggableData) {
    setAppWasDragged(true);
    if (isGrouped) {
      const dx = data.x - props.app.data.position.x;
      const dy = data.y - props.app.data.position.y;
      setDeltaPosition({ x: dx, y: dy, z: 0 }, props.app._id);
    }
  }

  // Handle when the app is finished being dragged
  function handleDragStop(_e: RndDragEvent, data: DraggableData) {
    let x = data.x;
    let y = data.y;
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;
    const dx = x - props.app.data.position.x;
    const dy = y - props.app.data.position.y;
    setPos({ x, y });
    setAppDragging(false);
    update(props.app._id, {
      position: {
        x,
        y,
        z: props.app.data.position.z,
      },
    });
    if (isGrouped) {
      selectedApps.forEach((appId) => {
        if (appId === props.app._id) return;
        const app = apps.find((el) => el._id == appId);
        if (!app) return;
        const p = app.data.position;
        update(appId, {
          position: {
            x: p.x + dx,
            y: p.y + dy,
            z: p.z,
          },
        });
      });
    }
    // Trying to optimize performance
    if (divRef.current) {
      // divRef.current.style.willChange = 'auto';
    }
  }

  // Handle when the window starts to resize
  function handleResizeStart() {
    // Trying to optimize performance
    if (divRef.current) {
      // divRef.current.style.willChange = 'transform';
    }
    setAppDragging(true);
    bringForward();
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

    // Trying to optimize performance
    if (divRef.current) {
      // divRef.current.style.willChange = 'auto';
    }
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
      dragHandleClassName={'handle'}
      size={{ width: size.width, height: size.height }}
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
      // TODO: Make this not required in the future with persmissions system
      // Not ideal but right now we need this to prevent guests from moving apps.
      // This happens locally before updating the server.
      // enableResizing={!isGuest}
      // disableDragging={isGuest}
      enableResizing={true}
      disableDragging={false}
    >
      {/* Title Above app */}
      {appTitles ? (
        <Box
          position="absolute"
          top="0px"
          left="0px"
          width={size.width}
          transform={`translate(-${2 / scale}px, calc(-100% - ${4 / scale}px))`}
          display="flex"
          justifyContent="left"
          alignItems="center"
          pointerEvents="none"
        >
          <Text
            color={titleColor}
            fontSize={16 / scale}
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            overflow="hidden"
            background={titleBackground}
            backdropFilter={`blur(${Math.max(5, 5 / scale)}px) brightness(${titleBrightness})`}
            borderRadius={6}
            px={2}
          >
            {props.app.data.title}
          </Text>
        </Box>
      ) : null}

      {/* Border Box around app to show it is selected */}
      <Box
        position="absolute"
        left={`${-borderWidth}px`}
        top={`${-borderWidth}px`}
        width={size.width + borderWidth * 2}
        height={size.height + borderWidth * 2}
        borderRadius={outerBorderRadius}
        opacity={isGrouped ? 0.6 : 1}
        zIndex={isGrouped ? 1000000 : -1} // Behind everything
        background={selected || isGrouped ? selectColor : borderColor}
        boxShadow={'4px 4px 12px 0px rgb(0 0 0 / 25%)'}
        pointerEvents={'none'}
      ></Box>

      {/* The Application */}
      <Box
        ref={divRef}
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
      {!selected ? (
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
      ) : null}
      {/* This div is to block the app from being interacted with when the user is dragging the board or an app */}
      {boardDragging || appDragging ? (
        <Box
          position="absolute"
          left="0px"
          top="0px"
          width="100%"
          height="100%"
          pointerEvents={'none'}
          userSelect={'none'}
          borderRadius={innerBorderRadius}
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
          height={size.height}
          pointerEvents={'none'}
          userSelect={'none'}
          zIndex={999999999}
          display="flex"
          justifyContent="center"
          alignItems="center"
          backgroundColor={backgroundColor}
        >
          <Box transform={`scale(${4 * Math.min(size.width / 300, size.height / 300)})`}>
            <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color={selected ? selectColor : 'gray'} size="xl" />
          </Box>
        </Box>
      ) : null}
    </Rnd>
  );
}
