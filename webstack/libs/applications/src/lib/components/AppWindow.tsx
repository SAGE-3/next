/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { DraggableData, Position, ResizableDelta, Rnd } from 'react-rnd';
import { Box, useToast, Text, Avatar, Tooltip } from '@chakra-ui/react';
import { MdOpenInFull, MdOutlineClose, MdOutlineCloseFullscreen } from 'react-icons/md';

import { App } from '../schema';
import { useAppStore, useUIStore, useUsersStore, initials } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';

type WindowProps = {
  app: App;
  aspectRatio?: number | boolean;
  children: JSX.Element;

  // React Rnd property to control the window aspect ratio (optional)
  lockAspectRatio?: boolean | number;
};

export function AppWindow(props: WindowProps) {
  // UI store for global setting
  const scale = useUIStore((state) => state.scale);
  const zindex = useUIStore((state) => state.zIndex);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const appDragging = useUIStore((state) => state.appDragging);
  const setAppDragging = useUIStore((state) => state.setAppDragging);
  const incZ = useUIStore((state) => state.incZ);
  const gridSize = useUIStore((state) => state.gridSize);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const selected = selectedApp === props.app._id;
  const selectColor = '#f39e4a';

  // Display messages
  const toast = useToast();
  // Height of the title bar
  const titleBarHeight = 24;

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

  // Track the app store errors
  useEffect(() => {
    if (storeError) {
      // Display a message'
      if (storeError.id && storeError.id === props.app._id)
        toast({ description: 'Error - ' + storeError.msg, duration: 3000, isClosable: true });
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
    const height = parseInt(ref.offsetHeight) - titleBarHeight;

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
    const height = parseInt(ref.offsetHeight) - titleBarHeight;

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

  // Close the app and delete from server
  function handleClose(e: any) {
    deleteApp(props.app._id);
  }

  // Minimize the app. Currently only local.
  function handleMinimize() {
    update(props.app._id, { minimized: !minimized });
  }

  // Track raised state
  useEffect(() => {
    if (props.app.data.raised) {
      // raise  my zIndex
      setMyZ(zindex + 1);
      // raise the global value
      incZ();
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
    // Raise down
    apps.forEach((a) => {
      if (a.data.raised) update(a._id, { raised: false });
    });
    // Bring to front function
    update(props.app._id, { raised: true });
  }

  return (
    <Rnd
      bounds="parent"
      dragHandleClassName={'handle'}
      size={{ width: size.width, height: `${minimized ? titleBarHeight : size.height + titleBarHeight}px` }} // Add the height of the titlebar to give the app the full size.
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
        boxShadow: `${minimized ? '' : '2px 2px 12px rgba(0,0,0,0.4)'}`,
        backgroundColor: `${minimized ? 'transparent' : 'gray'}`,
        borderRadius: '6px',
        zIndex: myZ,
      }}
      // minimum size of the app: 200 px
      minWidth={200}
      minHeight={200}
      // Scaling of the board
      scale={scale}
      // resize and move snapping to grid
      resizeGrid={[gridSize, gridSize]}
      dragGrid={[gridSize, gridSize]}
      enableResizing={!minimized}
    >
      {/* Border Box around app to show it is selected */}
      {selected ? (
        <Box
          position="absolute"
          left="-3px"
          top="-3px"
          width={size.width + 6}
          height={minimized ? titleBarHeight + 6 + 'px' : size.height + titleBarHeight + 6 + 'px'}
          border={`${4}px solid ${selectColor}`}
          borderRadius="8px"
          pointerEvents="none"
        ></Box>
      ) : null}
      {/* This div is to allow users to drag anywhere within the window when the app isnt selected*/}
      {!selected ? (
        <Box
          position="absolute"
          className="handle" // The CSS name react-rnd latches on to for the drag events
          left="-3px"
          top="-3px"
          width={size.width + 6}
          height={minimized ? titleBarHeight + 6 + 'px' : size.height + titleBarHeight + 6 + 'px'}
          borderRadius="8px"
          cursor="move"
          userSelect={'none'}
        ></Box>
      ) : null}
      {/* This div is to block the app from being interacted with */}
      {boardDragging || appDragging ? (
        <Box
          position="absolute"
          left="-3px"
          top="-3px"
          width={size.width + 6}
          height={minimized ? titleBarHeight + 6 + 'px' : size.height + titleBarHeight + 6 + 'px'}
          borderRadius="8px"
          pointerEvents={'none'}
          userSelect={'none'}
        ></Box>
      ) : null}

      {/* Title Bar */}
      <Box
        className="handle" // The CSS name react-rnd latches on to for the drag events
        display="flex"
        flexDirection="row"
        flexWrap="nowrap"
        justifyContent="space-between"
        alignItems="center"
        backgroundColor={selected ? selectColor : 'teal'}
        px="1"
        cursor={'move'}
        overflow="hidden"
        whiteSpace="nowrap"
        height={titleBarHeight + 'px'} // The height of the title bar
        borderRadius="6px 6px 0 0"
      >
        {/* Left Title Bar Elements */}
        <Box display="flex" alignItems="center">
          <Tooltip label={'Opened by ' + owner?.data.name} aria-label="username" hasArrow={true} placement="top-start">
            <Avatar
              name={owner?.data.name}
              getInitials={initials}
              // src={owner?.data.profilePicture}
              mr={1}
              bg={owner ? sageColorByName(owner.data.color) : 'orange'}
              borderRadius={'100%'}
              textShadow={'0 0 2px #000'}
              color={'white'}
              size={'2xs'}
              showBorder={true}
              borderWidth={'0.5px'}
              borderColor="whiteAlpha.600"
            />
          </Tooltip>
          <Text color="white">{props.app.data.description}</Text>
        </Box>
        {/* Right Title bar Elements */}
        <Box display="flex" alignItems="center">
          {/* Minimize Buttons */}
          {minimized ? (
            <Tooltip placement="top-start" hasArrow={true} label={'Open App'} openDelay={400}>
              <span>
                <MdOpenInFull cursor="pointer" color="white" onClick={handleMinimize} />
              </span>
            </Tooltip>
          ) : (
            <Tooltip placement="top-start" hasArrow={true} label={'Minimize App'} openDelay={400}>
              <span>
                <MdOutlineCloseFullscreen cursor="pointer" color="white" onClick={handleMinimize} />
              </span>
            </Tooltip>
          )}
          {/* Close Button Name */}
          <Tooltip placement="top-start" hasArrow={true} label={'Delete App'} openDelay={400}>
            <span>
              <MdOutlineClose cursor="pointer" color="white" fontSize="1.25rem" onClick={handleClose} />
            </span>
          </Tooltip>
        </Box>
      </Box>
      {/* End Title Bar */}

      {/* The Application */}
      <Box id={'app_' + props.app._id} width={size.width} height={size.height} overflow="hidden" display={minimized ? 'none' : 'inherit'}>
        {props.children}
      </Box>
    </Rnd>
  );
}
