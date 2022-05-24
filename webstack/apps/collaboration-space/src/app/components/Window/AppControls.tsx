/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';

import { Box, Spinner, ButtonGroup, Button, MenuItem, MenuList, Menu, MenuButton, Tooltip } from '@chakra-ui/react';

import { AppState, PanZoomState } from '@sage3/shared/types';
import { useAction, usePanZoom } from '@sage3/frontend/services';
import { MdCenterFocusStrong, MdZoomOutMap } from 'react-icons/md';
import { FaEllipsisV, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { AppPositionMotion } from './useAppPosition';
import { appControlBgColor } from '@sage3/frontend/ui';

type Position = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ControlStyle = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  transform?: string;
};

const defaultPos = {
  left: `${window.innerWidth / 2}px`,
  top: `${window.innerHeight + 500} px`,
  transform: `translateX(-50%)`,
} as ControlStyle;

function CalculateAppViewPortPosition(appPosition: AppPositionMotion, panZoomState: PanZoomState): Position {
  const x = (appPosition.x.get() + panZoomState.motionX.get()) * panZoomState.motionScale.get();
  const y = (appPosition.y.get() + panZoomState.motionY.get()) * panZoomState.motionScale.get();
  const width = appPosition.width.get() * panZoomState.motionScale.get();
  const height = appPosition.height.get() * panZoomState.motionScale.get();
  return { x, y, width, height };
}

export function AppControls(
  props: {
    canvasSize: { height: number; width: number };
    scaleBy: number;
    appPosition: AppPositionMotion;
    children?: React.ReactNode;
  } & AppState
): JSX.Element {
  const { id } = props;
  const { act } = useAction();

  const [panZoomState, dispatchPanZoom] = usePanZoom();

  // Used for Maximize save state to undo a maximize
  const [saveStateTimeOut, setSaveStateTimeOut] = useState<boolean>(false);
  const [savedAppState, setSavedAppState] = useState<AppState | null>(null);

  // The position of the ControlBar
  const [controlPos, setControlPos] = useState<ControlStyle>(defaultPos);

  // Update Window ViewPort Position if app moves or panZoomState chagnes
  useEffect(() => {
    function CalcControlPos() {
      const windowPos = CalculateAppViewPortPosition(props.appPosition, panZoomState);

      const winY = windowPos.y;
      const winH = windowPos.height;
      const viewH = window.innerHeight;

      const controlBarSize = 42; // This is in px.
      const titleBarSize = 2 * 16 * props.scaleBy; // Title bar is 1rem by default.
      const spacer = 24; // 24 px space between control bar
      const scale = panZoomState.motionScale.get();

      const appTop = { top: `${Math.max(16, windowPos.y - (controlBarSize + (titleBarSize + spacer) * scale))}px` };
      const appBottom = { top: `${windowPos.y + windowPos.height + spacer * scale}px` };
      const winFixedBottom = { bottom: '1rem' };
      const winBottom = { bottom: '4.5rem' };
      const winTop = { top: '1rem' };

      const appCenterLeft = windowPos.x + windowPos.width / 2;
      const maxLeft = window.innerWidth;
      const minLeft = 0;
      const left = Math.max(minLeft, Math.min(maxLeft, appCenterLeft));
      const xTranslate = left === maxLeft ? '-100%' : left === minLeft ? '0%' : '-50%';

      const appCenter = {
        left: `${left}px`,
        transform: `translateX(${xTranslate})`,
      };
      const winCenter = {
        left: `50%`,
        transform: `translateX(-50%)`,
      };

      let position = {} as ControlStyle;

      // Window is larger than the viewport height
      if (winH + (2 * (spacer + controlBarSize) + titleBarSize) > viewH) {
        position = { ...winCenter, ...winFixedBottom };
        // Top of window is above top of viewport
      } else if (winY < 100) {
        // Window is above viewport and too small to see
        if (winY + winH < 100) {
          position = { ...appCenter, ...winTop };
          // Window is above viewport but can see the bottom of the app
        } else {
          position = { ...appCenter, ...appBottom };
        }
        // Top of Window is within the viewport
      } else if (winY > 100 && winY + 100 < viewH) {
        // Can't see the bottom of the app
        if (winY + winH > viewH) {
          position = { ...appCenter, ...appTop };
        } else {
          // Is the middle of the app above the middle of the viewport?
          if (winY + winH < viewH / 1.2) {
            position = { ...appCenter, ...appBottom };
          } else {
            position = { ...appCenter, ...appTop };
          }
        }
        // Top of the app is below the viewport
      } else {
        position = { ...appCenter, ...winBottom };
      }
      setControlPos(position);
    }

    CalcControlPos();

    // Listen to the changes to the panpanZoomState
    const zoomUnsub = panZoomState.motionScale.onChange(CalcControlPos);
    const pXUnsub = panZoomState.motionX.onChange(CalcControlPos);
    const pYUnsub = panZoomState.motionY.onChange(CalcControlPos);

    // Listen to the changes to the appPosition
    const xUnsub = props.appPosition.x.onChange(CalcControlPos);
    const yUnsub = props.appPosition.y.onChange(CalcControlPos);
    const widthUnsub = props.appPosition.width.onChange(CalcControlPos);
    const heightUnsub = props.appPosition.height.onChange(CalcControlPos);

    window.addEventListener('resize', CalcControlPos);

    return () => {
      zoomUnsub();
      pXUnsub();
      pYUnsub();
      xUnsub();
      yUnsub();
      widthUnsub();
      heightUnsub();
      window.removeEventListener('resize', CalcControlPos);
    };
  }, [props.position]);

  useEffect(() => {
    if (saveStateTimeOut === false) {
      // If the window is moved or resized null the saved state.
      setSavedAppState(null);
    }
  }, [props.position]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        height: '42px',
        ...controlPos,
      }}
    >
      <Box bg={appControlBgColor()} borderColor="gray" borderWidth="1px" p={2} zIndex="overlay" d="flex" alignItems="center" rounded="lg">
        <React.Suspense fallback={<Spinner />}>
          <ButtonGroup size="sm" variant="outline" colorScheme="teal">
            {props.children}
            <ButtonGroup spacing={1} size="xs" variant="ghost">
              <Menu placement="bottom">
                <Tooltip hasArrow={true} label={'View'} openDelay={300}>
                  <MenuButton as={Button} colorScheme="teal" aria-label="layout">
                    <FaEllipsisV />
                  </MenuButton>
                </Tooltip>
                <MenuList minWidth="150px">
                  <MenuItem
                    onClick={() => {
                      // Return window to its original state
                      if (savedAppState != null) {
                        act({
                          type: 'resize',
                          position: {
                            x: savedAppState.position.x,
                            y: savedAppState.position.y,
                            width: savedAppState.position.width,
                            height: savedAppState.position.height,
                          },
                          id: props.id,
                        });
                        setSavedAppState(null);
                        return;
                      }
                      // Save the current state of the app to be able to restore if button is clicked again
                      setSavedAppState(props);
                      const appAspect = props.position.width / props.position.height;
                      const canvasAspect = props.canvasSize.width / props.canvasSize.height;
                      let newHeight,
                        newWidth,
                        newY,
                        newX = 0;

                      if (canvasAspect <= appAspect) {
                        newWidth = props.canvasSize.width;
                        newHeight = (newWidth / props.position.width) * props.position.height;
                        newX = 0;
                        newY = props.position.y;
                        if (newY + newHeight > props.canvasSize.height) newY = props.canvasSize.height - newHeight;
                      } else {
                        newHeight = props.canvasSize.height;
                        newWidth = (newHeight / props.position.height) * props.position.width;
                        newY = 0;
                        newX = props.position.x;
                        if (newX + newWidth > props.canvasSize.width) newX = props.canvasSize.width - newWidth;
                      }
                      act({
                        type: 'resize',
                        position: {
                          x: newX,
                          y: newY,
                          width: newWidth,
                          height: newHeight,
                        },
                        id: props.id,
                      });
                      // Used to ignore the "resize" from the maximize triggering the useffect
                      setSaveStateTimeOut(true);
                      setTimeout(() => {
                        setSaveStateTimeOut(false);
                      }, 1000);
                    }}
                    icon={<MdZoomOutMap />}
                  >
                    Maximize
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      // Dispatch the new values
                      dispatchPanZoom({ type: 'zoom-to-app', appPosition: props.position });
                    }}
                    icon={<MdCenterFocusStrong />}
                  >
                    Zoom To
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      act({
                        type: 'close',
                        id,
                      })
                    }
                    icon={<FaTimes />}
                  >
                    Close App
                  </MenuItem>
                </MenuList>
              </Menu>
            </ButtonGroup>
          </ButtonGroup>
        </React.Suspense>
      </Box>
    </motion.div>
  );
}
