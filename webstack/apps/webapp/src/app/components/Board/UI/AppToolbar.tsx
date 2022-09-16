/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, useColorModeValue, Text, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';

import { Rnd } from 'react-rnd';
import { ErrorBoundary } from 'react-error-boundary';
import { MdClose, MdOpenInFull, MdOutlineCloseFullscreen } from 'react-icons/md';
import { sageColorByName } from '@sage3/shared';

type AppToolbarProps = {
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
};

/**
 * AppToolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function AppToolbar(props: AppToolbarProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const updateApp = useAppStore((state) => state.update);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);

  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // UI store
  const showUI = useUIStore((state) => state.showUI);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const appToolbar = useUIStore((state) => state.setAppToolbarPosition);
  const scale = useUIStore((state) => state.scale);

  // Hover state
  const [hover, setHover] = useState(false);

  // Div Ref
  const rndRef = useRef<any>(null);

  const [toolbarWidth, setToolbarWidth] = useState(0);

  useLayoutEffect(() => {
    if (rndRef.current && selectedApp) {
      setToolbarWidth(rndRef.current.clientWidth);
    }
  }, [rndRef.current, selectedApp]);

  function handleDblClick(e: any) {
    e.stopPropagation();
  }

  const app = apps.find((app) => app._id === selectedApp);
  const commonButtonColors = useColorModeValue('gray.300', 'gray.500');

  useEffect(() => {
    if (app) {
      let ax = app.data.position.x * scale;
      let ay = app.data.position.y * scale;
      let ah = app.data.size.height * scale;
      let aw = app.data.size.width * scale;
      const bx = boardPosition.x * scale;
      const by = boardPosition.y * scale;
      const tw = toolbarWidth / 2;
      const appWindowX = bx + ax;
      const appWindowY = by + ay;
      const appBottomY = appWindowY + ah;
      const wh = window.innerHeight;
      const ww = window.innerWidth;
      const x = appWindowX + aw / 2 - tw;
      let y = appWindowY + ah + 35 * scale;
      if (appBottomY + 100 > wh) {
        y = appWindowY - 65 - 35 * scale;
      }
      appToolbar({ x, y });
    }
  }, [app?.data.position, app?.data.size, scale, boardPosition.x, boardPosition.y, window.innerHeight, window.innerWidth]);

  function getAppToolbar() {
    if (app) {
      const Component = Applications[app.data.type].ToolbarComponent;
      return (
        <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <Text>An error has occured.</Text>}>
          <>
            <Component key={app._id} {...app}></Component>
            <ButtonGroup isAttached size="xs" ml="2">
              <Tooltip placement="top" hasArrow={true} label={'Minimize App'} openDelay={400}>
                <Button onClick={() => updateApp(app._id, { minimized: !app.data.minimized })} backgroundColor={commonButtonColors}>
                  {app.data.minimized ? <MdOpenInFull fontSize="18" /> : <MdOutlineCloseFullscreen fontSize="18" />}
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Delete App'} openDelay={400}>
                <Button onClick={() => deleteApp(app._id)} backgroundColor={commonButtonColors}>
                  <MdClose fontSize="18" />
                </Button>
              </Tooltip>
            </ButtonGroup>
          </>
        </ErrorBoundary>
      );
    } else {
      return <Text>No app selected</Text>;
    }
  }

  if (showUI && app)
    return (
      <Rnd
        position={{ ...props.position }}
        bounds="window"
        onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => {
          setHover(false);
          props.setPosition({ x: data.x, y: data.y });
        }}
        enableResizing={false}
        dragHandleClassName="handle" // only allow dragging the header
        style={{ transition: hover ? 'none' : 'all 0.2s' }}
      >
        <Box
          display="flex"
          border="solid 3px"
          borderColor="orange.400"
          transition="all .2s "
          bg={panelBackground}
          p="2"
          rounded="md"
          ref={rndRef}
        >
          <Box
            width="25px"
            backgroundImage={`radial-gradient(${gripColor} 2px, transparent 0)`}
            backgroundPosition="0 0"
            backgroundSize="8px 8px"
            mr="2"
            cursor="move"
            className="handle"
          />

          <Box display="flex" flexDirection="column">
            <Text
              w="100%"
              textAlign="left"
              mx={1}
              color={textColor}
              fontSize={14}
              fontWeight="bold"
              h={'auto'}
              userSelect={'none'}
              className="handle"
              cursor="move"
            >
              {app?.data.name}
            </Text>
            <Box alignItems="center" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
              {getAppToolbar()}
            </Box>
          </Box>
        </Box>
      </Rnd>
    );
  else return null;
}
