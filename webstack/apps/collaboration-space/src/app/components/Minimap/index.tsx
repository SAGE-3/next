/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

// Import Chakra UI elements
import {
  Box,
  Button,
  Tooltip,
  Text,
  VStack,
  ButtonGroup,
  useToast,
  useDisclosure,
  Modal,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';

// Import some icons
import {
  MdLastPage,
  MdFirstPage,
  MdLockOpen,
  MdLock,
  MdAdd,
  MdRemove,
  MdCenterFocusStrong as ResetZoomIcon,
  MdZoomOutMap,
} from 'react-icons/md';

import { AppAction, AppState, SAGE3State, UserPresence } from '@sage3/shared/types';
import { PanZoomAction, useAction, usePanZoom, useUser, useUsers } from '@sage3/frontend/services';
// SAGE3 components
import { S3Button, localMenuColor } from '@sage3/frontend/ui';
import { GoTrashcan } from 'react-icons/go';
import HideMenu from 'libs/frontend/components/src/lib/hide-menu/hide-menu';

/**
 * Prop type for the minimap
 *
 * @interface MinimapProps
 */
interface MinimapProps {
  canvasSize: {
    width: number;
    height: number;
  };
  apps: SAGE3State['apps'];
  boardId: string;
}

/**
 * Minimap width (height calculated from canvas aspect ratio)
 */
const minimapWidth = 250;

/**
 * Minimap component
 *
 * @export
 * @param {MinimapProps} props
 * @returns {JSX.Element}
 */
function MinimapComponent(props: MinimapProps): JSX.Element {
  const aspect = props.canvasSize.width / props.canvasSize.height;
  const svgRef = useRef<SVGSVGElement>(null);
  const toast = useToast();

  const [panZoomState, dispatchPanZoom] = usePanZoom();
  const [scaleValue, setScaleValue] = useState(panZoomState.motionScale.get());
  const [isLocked, setIsLocked] = useState(panZoomState.isLocked);

  useEffect(() => {
    panZoomState.motionScale.onChange((latest) => {
      setScaleValue(latest);
    });
  }, []);

  const dragX = useTransform(panZoomState.motionX, (x) => (-x / props.canvasSize.width) * minimapWidth);
  const dragY = useTransform(panZoomState.motionY, (y) => ((-y / props.canvasSize.height) * minimapWidth) / aspect);
  const dragWidth = useTransform(panZoomState.motionScale, (s) => (window.innerWidth / s / props.canvasSize.width) * minimapWidth);
  const dragHeight = useTransform(
    panZoomState.motionScale,
    (s) => ((window.innerHeight / s / props.canvasSize.height) * minimapWidth) / aspect
  );

  const users = useUsers();
  const { id } = useUser();
  const filteredUsers = users.filter((el) => el.boardId === props.boardId);

  const { act } = useAction();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // handle dispatchPanZoom to check if board is locked
  const dispatchPanZoomHandler = (action: PanZoomAction) => {
    if (panZoomState.isLocked) {
      // if locked, display toast
      toast({
        title: `The board view is currently locked.`,
        status: 'error',
        position: 'top',
        duration: 2 * 1000,
        isClosable: true,
      });
    } else {
      dispatchPanZoom(action);
    }
  };

  return (
    <HideMenu menuName="Map" menuPosition="bottomRight">
      <Box
        d="flex"
        alignItems="center"
        background={localMenuColor()}
        borderRadius="1rem"
        py="0.5rem"
        pr="0.5rem"
        pl="1.25rem"
        border="gray 2px solid"
      >
        <VStack mr="1rem" mt="-.3rem">
          <Text fontWeight="bold" fontSize="larger" fontFamily="monospace">
            {(scaleValue * 100).toFixed()}%
          </Text>
          <ButtonGroup size="sm" isAttached variant="outline">
            <S3Button
              tooltipPlacement="left"
              aria-label="Zoom out"
              tooltipLabel="Zoom Out"
              icon={<MdRemove />}
              onClick={() => dispatchPanZoomHandler({ type: 'zoom-out' })}
            />
            <S3Button
              tooltipPlacement="right"
              aria-label="Zoom in"
              tooltipLabel="Zoom In"
              icon={<MdAdd />}
              onClick={() => dispatchPanZoomHandler({ type: 'zoom-in' })}
            />
          </ButtonGroup>
          <ButtonGroup size="sm" isAttached variant="outline">
            <S3Button
              tooltipPlacement="left"
              aria-label="Fit Board"
              tooltipLabel="Fit Board"
              icon={<MdZoomOutMap />}
              onClick={() => dispatchPanZoomHandler({ type: 'fit-board' })}
            />
            <S3Button
              tooltipPlacement="right"
              aria-label="Show All Apps"
              tooltipLabel="Show All Apps"
              icon={<ResetZoomIcon />}
              onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                // Check if there are no apps
                if (Object.values(props.apps).length > 0 && event.button === 0) {
                  dispatchPanZoomHandler({ type: 'fit-apps', appPositions: Object.values(props.apps).map((el) => el.position) });
                }
              }}
            />
          </ButtonGroup>
          <ButtonGroup size="sm" isAttached variant="outline">
            <S3Button
              tooltipPlacement="left"
              aria-label="Clear the Board"
              tooltipLabel="Clear the Board"
              icon={<GoTrashcan />}
              onClick={onOpen}
              disabled={Object.keys(props.apps).length < 1 ? true : false}
            />
            <Modal isCentered isOpen={isOpen} onClose={onClose}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Clear the Board</ModalHeader>
                {/* <ModalCloseButton /> */}
                <ModalBody>Are you sure you want to DELETE all apps?</ModalBody>

                <ModalFooter>
                  <Button colorScheme="teal" size="md" variant="outline" mr={3} onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    colorScheme="red"
                    size="md"
                    onClick={() => {
                      if (props.apps) {
                        const actions = [] as AppAction[keyof AppAction][];
                        Object.values(props.apps).forEach((app: AppState) => {
                          actions.push({ type: 'close', id: app.id });
                        });
                        act(actions);
                      }
                      onClose();
                    }}
                  >
                    Yes, Clear the Board
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
            <S3Button
              tooltipPlacement="right"
              aria-label={isLocked ? 'Unlock View' : 'Lock View'}
              tooltipLabel={isLocked ? 'Unlock View' : 'Lock View'}
              icon={isLocked ? <MdLock /> : <MdLockOpen />}
              onClick={() => {
                dispatchPanZoom({ type: 'lock' });
                setIsLocked((prev) => !prev);
              }}
            />
          </ButtonGroup>
        </VStack>
        <motion.svg
          ref={svgRef}
          initial={false}
          animate={{ width: minimapWidth, height: minimapWidth / aspect, opacity: 1 }}
          style={{
            background: '#aaac',
            border: 'lightgray 2px solid',
          }}
          onClick={(event: any) => {
            const clickX = event.clientX;
            const clickY = event.clientY;
            const divWidth = (event.target as any).clientWidth;
            const divHeight = (event.target as any).clientHeight;
            const divX = event.target.getBoundingClientRect().x;
            const divY = event.target.getBoundingClientRect().y;
            const posX = clickX - divX;
            const posY = clickY - divY;
            const x = posX * (props.canvasSize.width / divWidth);
            const y = posY * (props.canvasSize.height / divHeight);
            dispatchPanZoom({ type: 'translate-to', position: { x: -x, y: -y } });
          }}
          onWheel={(event: any) => {
            if (event.deltaY < 0) {
              dispatchPanZoom({ type: 'zoom-in', delta: event.deltaY });
            } else if (event.deltaY > 0) {
              dispatchPanZoom({ type: 'zoom-out', delta: event.deltaY });
            }
          }}
        >
          {/* Draw the apps */}
          {Object.values(props.apps).map((app) => (
            <motion.rect
              key={app.id}
              initial={false}
              animate={{
                x: (app.position.x / props.canvasSize.width) * minimapWidth,
                y: ((app.position.y / props.canvasSize.height) * minimapWidth) / aspect,
                width: (app.position.width / props.canvasSize.width) * minimapWidth,
                height: ((app.position.height / props.canvasSize.height) * minimapWidth) / aspect,
              }}
              fill="#fffa"
              stroke="#666"
              strokeWidth={1.25}
              whileHover={{ fill: '#B2F5EA' }}
              onClick={(event) => {
                event.stopPropagation();
                dispatchPanZoom({ type: 'zoom-to-app', appPosition: app.position });
              }}
            />
          ))}

          {/* Draw current viewport */}
          <motion.rect
            initial={false}
            style={{
              x: dragX,
              y: dragY,
              width: dragWidth,
              height: dragHeight,
              stroke: '#13AFA0',
              strokeWidth: 4,
              strokeDasharray: 3,
              position: 'absolute',
              pointerEvents: 'none',
              fill: `#13AFA036`,
            }}
            fill="transparent"
            cursor="grab"
          />

          {/* Draw users pointers */}
          {filteredUsers.map((user: UserPresence) => {
            if (user.id !== id) {
              return (
                <motion.circle
                  key={user.id}
                  initial={false}
                  animate={{
                    cx: -((user.cursor[0] / props.canvasSize.width) * minimapWidth),
                    cy: -(((user.cursor[1] / props.canvasSize.height) * minimapWidth) / aspect),
                    r: 3,
                  }}
                  fill={user.color}
                  stroke="#fffa"
                  strokeWidth={0.5}
                />
              );
            } else if (user.id === id) {
              return (
                <motion.circle
                  key={user.id}
                  initial={false}
                  animate={{
                    cx: -((user.cursor[0] / props.canvasSize.width) * minimapWidth),
                    cy: -(((user.cursor[1] / props.canvasSize.height) * minimapWidth) / aspect),
                    r: 4,
                  }}
                  fill="white"
                  stroke="white"
                  strokeWidth={1}
                />
              );
            } else return null;
          })}
        </motion.svg>
      </Box>
    </HideMenu>
  );
}

export const Minimap = React.memo(MinimapComponent);
