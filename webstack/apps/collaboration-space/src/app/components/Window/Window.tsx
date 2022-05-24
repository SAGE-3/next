/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

import { ErrorBoundary } from 'react-error-boundary';

import { Stack, Box, Button, Flex, Spacer, Avatar, Tooltip } from '@chakra-ui/react';
import { FaUndo } from 'react-icons/fa';

import { AppState, AppExport, AppMetadata } from '@sage3/shared/types';
import { useAction } from '@sage3/frontend/services';
import { Layout } from '@sage3/frontend/smart-data/layout';
import { fixedCharAt } from '@sage3/frontend/utils/misc/strings';

import * as Apps from '@sage3/applications';

import { DragCorner } from './DragCorner';
import { AppTitleBar } from './AppTitleBar';
import { useAppPosition } from './useAppPosition';
import ContextMenu from 'libs/frontend/components/src/lib/context-menu/context-menu';

declare module 'csstype' {
  interface Properties {
    // Add a missing property
    containIntrinsicSize?: string;
  }
}

const APPS = Apps as Record<keyof typeof Apps, AppExport>;

interface WindowProps {
  app: AppState;
  scaleBy: number;
  zoomState: () => { x: number; y: number; scale: number };
  canvasSize: { width: number; height: number };
  onClick: Function;
  selected: boolean;
  panzoomEnabled: boolean;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary(): void }) {
  return (
    <Stack
      d="flex"
      flexFlow="column"
      roundedBottomLeft="lg"
      bg="red.800"
      fontWeight="bold"
      p={4}
      position="absolute"
      w="full"
      h="full"
      left="0"
      top="0"
      right="0"
      bottom="0"
      userSelect="text"
      _hover={{ shadow: 'xl' }}
      // Make sure the app content does not spill over
      overflow="hidden"
    >
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <pre>{error.stack}</pre>
      <Button mt={4} leftIcon={<FaUndo />} onClick={resetErrorBoundary}>
        Try again
      </Button>
    </Stack>
  );
}

const Memoized = React.memo(Window);
export { Memoized as Window };

function Window(props: WindowProps) {
  const { App, Controls, Title, __meta__ } = APPS[props.app.appName as keyof typeof APPS];
  const { act } = useAction();
  const {
    position: { x, y, width, height },
  } = props.app;

  const [direction, setDirection] = useState('-');
  const [gridMagnet, setGridMagnet] = useState(false);
  const [menuIsOpen, setMenuOpen] = useState(false);
  const menuCloser = useRef<number | undefined>();

  // Minimum window sizes
  const minWidth = 300;
  const minheight = 200;

  const appPosition = useAppPosition(
    // Application position
    props.app.position,
    // Set of constraint in position and size (min/max values)
    // between minWidth/minHeight and canvas dimensions
    {
      x: [0, props.canvasSize.width],
      y: [2 * props.scaleBy * 16, props.canvasSize.height],
      width: [minWidth, props.canvasSize.width],
      height: [minheight, props.canvasSize.height],
    }
  );
  const avatarSize = ['xs', 'md', 'lg', 'xl'];

  const [dragging, setDragging] = useState(false);

  return (
    <div
      onMouseDown={() => {
        // if the menu is already opened, don't raise the app
        if (!menuIsOpen)
          act({
            type: 'raise',
            id: props.app.id,
          });
      }}
      style={{
        position: 'absolute',
        zIndex: props.app.position.zIndex,
        pointerEvents: props.panzoomEnabled ? 'none' : 'auto',
      }}
      onClick={(event) => {
        if (!dragging) {
          props.onClick(props.app.id, appPosition.motion);
        }
      }}
    >
      <motion.div
        initial={false}
        animate={{
          x,
          y,
          width,
          height,
        }}
        style={{
          position: 'absolute',
          ...appPosition.motion,
        }}
        onHoverStart={() => {
          window.clearTimeout(menuCloser.current);
          setMenuOpen(true);
        }}
        onTap={() => {
          window.clearTimeout(menuCloser.current);
          setMenuOpen(true);
        }}
        onHoverEnd={() => {
          menuCloser.current = window.setTimeout(() => setMenuOpen(false), 50);
        }}
      >
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => console.log('reset boundary')}>
          <WindowContent app={props.app} scaleBy={props.scaleBy} App={App} Controls={Controls} __meta__={__meta__} />
        </ErrorBoundary>
      </motion.div>

      <AppTitleBar
        titleBarColor={props.selected ? 'teal.400' : 'blue.700'}
        motion={appPosition.motion}
        set={appPosition.set}
        zoomState={props.zoomState}
        scaleBy={props.scaleBy}
        position={props.app.position}
        onDragEnd={() => {
          act({
            type: 'move',
            position: {
              x: appPosition.motion.x.get(),
              y: appPosition.motion.y.get(),
            },
            id: props.app.id,
          });
        }}
        onHoverStart={() => {
          window.clearTimeout(menuCloser.current);
          setMenuOpen(true);
        }}
        onHoverEnd={() => {
          menuCloser.current = window.setTimeout(() => setMenuOpen(false), 50);
        }}
      >
        <Box mx={'1rem'} d="flex" flex="1 0 10px" overflow="hidden" color="white" whiteSpace="nowrap" fontSize={`${props.scaleBy}rem`}>
          <React.Suspense fallback={'Loading...'}>
            <Flex width="100%">
              {/* The title of the app */}
              {Title ? <Title {...props.app} __meta__={__meta__} /> : <span>{props.app.appName}</span>}
              <Spacer />
              {/* Add the icon of the person who opened the app, tooltip showing fullname */}
              <Tooltip label={props.app.info.createdBy.name} aria-label="username" hasArrow={true} placement="top-start">
                <Avatar
                  name={props.app.info.createdBy.name}
                  // src={props.app.info.createdBy.profilePicture}
                  getInitials={(name) => {
                    return fixedCharAt(name, 0);
                  }}
                  mr={0}
                  bg={props.app.info.createdBy.color}
                  borderRadius={'100%'}
                  textShadow={'0 0 2px #000'}
                  color={'white'}
                  size={avatarSize[props.scaleBy - 1]}
                  showBorder={true}
                  borderColor="whiteAlpha.600"
                />
              </Tooltip>
            </Flex>
          </React.Suspense>
        </Box>
      </AppTitleBar>
      {['bottomright', 'bottomleft', 'topleft', 'topright'].map((pos: string) => {
        return (
          <DragCorner
            key={pos}
            position={props.app.position}
            motion={appPosition.motion}
            set={appPosition.set}
            constraints={appPosition.constraints}
            corner={pos as 'bottomright' | 'bottomleft' | 'topleft' | 'topright'}
            scaleBy={props.scaleBy}
            onDragStart={() => {
              setDragging(true);
            }}
            onDragEnd={(offset) => {
              act({
                type: 'resize',
                position: {
                  x: appPosition.motion.x.get(),
                  y: appPosition.motion.y.get(),
                  width: appPosition.motion.width.get(),
                  height: appPosition.motion.height.get(),
                },
                id: props.app.id,
              });
              setDragging(false);
            }}
          />
        );
      })}
      {/* Div that sits on top of the window app that allows it to be clicked to be selected. 
          This is for Webview specifically but also kinda puts a safeguard when interacting with apps where the user has to click on an app before he can interact with it directly
      */}

      <motion.div
        onMouseDown={(event) => {
          // shift to lock the direction of the movement
          if (event.shiftKey) {
            setDirection('xy');
          }
          if (event.altKey) {
            setGridMagnet(true);
          }
        }}
        onMouseMove={(event) => {
          if (event.altKey) {
            setGridMagnet(true);
          } else {
            setGridMagnet(false);
          }
        }}
        onMouseUp={() => {
          // reset the direction
          setDirection('-');
          setGridMagnet(false);
        }}
        onClick={(event) => {
          if (!dragging) {
            props.onClick(props.app.id, appPosition.motion);
          }
        }}
        onDragStart={(event) => {
          setDragging(true);
        }}
        onDirectionLock={(event) => {
          // direction calculated by motion library
          setDirection(event);
        }}
        onDrag={(e, info) => {
          let newX = x + info.offset.x / props.zoomState().scale;
          let newY = y + info.offset.y / props.zoomState().scale;
          if (gridMagnet) {
            newX = Math.round(newX / 128) * 128
            newY = Math.round(newY / 128) * 128
          }
          if (direction === 'x') {
            appPosition.set.x(newX);
          } else if (direction === 'y') {
            appPosition.set.y(newY);
          } else {
            appPosition.set.x(newX);
            appPosition.set.y(newY);
          }
        }}
        onDragEnd={() => {
          // do the move
          act({
            type: 'move',
            position: {
              x: appPosition.motion.x.get(),
              y: appPosition.motion.y.get(),
            },
            id: props.app.id,
          });
          setTimeout(() => setDragging(false), 1000);
        }}
        drag={true}
        dragDirectionLock={direction === 'xy'}

        style={{
          left: x,
          top: y,
          width,
          height,
          background: 'transparent',
          position: 'absolute',
          zIndex: 999999,
          pointerEvents: (props.selected || props.panzoomEnabled) && !dragging ? 'none' : 'auto',
        }}
      ></motion.div>
    </div>
  );
}

const WindowContent = React.memo(WindowContentComponent);

function WindowContentComponent(props: {
  app: AppState;
  scaleBy: number;
  App: AppExport['App'];
  Controls: AppExport['Controls'];
  __meta__: AppMetadata;
}) {
  const { App, __meta__ } = props;

  return (
    <Stack
      d="flex"
      direction="column"
      bg="blackAlpha.700"
      position="absolute"
      w="full"
      h="full"
      left="0"
      top="0"
      /* added oct 27 */
      roundedBottom="lg"
      right="0"
      bottom="0"
      userSelect="text"
      _hover={{ shadow: 'xl' }}
      // Make sure the app content does not spill over
      overflow="hidden"
      style={{
        contentVisibility: 'auto',
        contain: 'size layout style paint', // size layout, style or paint
        containIntrinsicSize: props.app.position.width + 'px ' + props.app.position.height + 'px',
      }}
    >
      <Layout layout={props.app.layout} id={props.app.id} appName={props.app.appName}>
        <React.Suspense
          fallback={
            <Box
              p={2}
              bg="gray.200"
              color="gray.800"
              border={2}
              borderColor="gray.100"
              shadow="base"
              rounded="md"
              flex="1 0 200px"
              d="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xl"
              fontWeight="thin"
            >
              Loading App...
            </Box>
          }
        >
          <App {...props.app} __meta__={__meta__} scaleBy={props.scaleBy} />
        </React.Suspense>
      </Layout>
    </Stack>
  );
}
