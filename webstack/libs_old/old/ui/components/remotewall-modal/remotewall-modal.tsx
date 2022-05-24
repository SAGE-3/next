/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useState } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  ButtonGroup,
  Tooltip,
  IconButton,
  HStack,
} from '@chakra-ui/react';

import { useUser, useUsers } from '@sage3/frontend/services';
import { useSocket } from '@sage3/frontend/utils/misc';
import { RemoteWallMessage, SAGE3State, UserPresence } from '@sage3/shared/types';

import { motion } from 'framer-motion';

// Icons
import { MdAdd, MdRemove, MdCenterFocusStrong as ResetZoomIcon, MdZoomOutMap } from 'react-icons/md';
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardArrowUp,
  MdOutlineContentPaste,
  MdOutlineContentPasteOff,
} from 'react-icons/md';

/**
 * Remote Wall Modal Control
 * props:
 *   open: boolean,
 *   userId?: string,
 *   canvasSize: { width: number, height: number },
 *   apps: SAGE3State['apps'];
 *   boardId: string;
 * @returns {(JSX.Element|null)}
 */
export function RemoteWallModal(props: {
  open: boolean;
  userId?: string;
  canvasSize: { width: number; height: number };
  apps: SAGE3State['apps'];
  boardId: string;
}): JSX.Element | null {
  if (props.userId == undefined) return null;

  const users = useUsers();
  const { id } = useUser();
  const user = users.find((u) => u.id == props.userId);
  const filteredUsers = users.filter((el) => el.boardId === props.boardId);
  if (user == undefined) return null;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const svgRef = useRef<SVGSVGElement>(null);
  const aspect = props.canvasSize.width / props.canvasSize.height;
  const minimapWidth = 720;

  const mapScale = minimapWidth / props.canvasSize.width;

  const [x, setX] = useState(-user.view.x * mapScale);
  const [y, setY] = useState(-user.view.y * mapScale);
  const [width, setWidth] = useState(user.view.w * mapScale);
  const [height, setHeight] = useState(user.view.h * mapScale);

  const socket = useSocket();

  const [messageSentAt, setMessageSentAt] = useState<number>(Date.now());
  const messageDelay = 0.1 * 1000; // 0.1 sec

  /**
   * Send a command to move the remote view
   * @param {string} senderId
   * @param {string} wallId
   * @param {string} type
   * @param {({ x: number, y: number, zoom: number } | { delta: number })} [data]
   */
  function sendMessage(senderId: string, wallId: string, type: string, data?: { x: number; y: number; zoom: number } | { delta: number }) {
    if (Date.now() - messageSentAt > messageDelay) {
      setMessageSentAt(Date.now());
      socket.emit('remotewall-message', { senderId, wallId, data, type } as RemoteWallMessage);
    }
  }

  useEffect(() => {
    setX(-user.view.x * mapScale);
    setY(-user.view.y * mapScale);
    setWidth(user.view.w * mapScale);
    setHeight(user.view.h * mapScale);
  }, [user.view]);

  useEffect(() => {
    if (props.open == true) {
      onOpen();
    }
  }, [props.open]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered={true} motionPreset="scale">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Remote Control of {user.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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

              sendMessage(id, user.id, 'new-view', { x, y, zoom: user.view.s });
            }}
            onWheel={(event: any) => {
              if (event.deltaY < 0) {
                sendMessage(id, user.id, 'zoom-in', { delta: 5 });
              } else if (event.deltaY > 0) {
                sendMessage(id, user.id, 'zoom-out', { delta: 5 });
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

                  // Calculate zoom value: fill the screen at 90% when clicked
                  const scaleW = ((user.view.w * user.view.s) / app.position.width) * 0.9;
                  const scaleH = ((user.view.h * user.view.s) / (app.position.height + 30)) * 0.9;
                  const zoomValue = Math.min(scaleW, scaleH);

                  const x = app.position.x + app.position.width / 2;
                  const y = app.position.y + app.position.height / 2;

                  // Dispatch the new values
                  sendMessage(id, user.id, 'new-view', { x, y, zoom: zoomValue });
                }}
              />
            ))}

            {/* Draw current viewport */}
            <motion.rect
              initial={false}
              animate={{
                x: x,
                y: y,
                width: width,
                height: height,
              }}
              style={{
                stroke: '#13AFA0',
                strokeWidth: 4,
                strokeDasharray: 3,
                position: 'absolute',
                pointerEvents: 'none',
                fill: '#13AFA036',
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
              }
            })}
          </motion.svg>
        </ModalBody>

        <ModalFooter justifyContent="center">
          <HStack justify="center">
            <ButtonGroup size="md" isAttached variant="solid" colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label="Zoom Out" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Zoom Out"
                  icon={<MdRemove />}
                  onClick={() => sendMessage(id, user.id, 'zoom-out', { delta: 5 })}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Zoom In" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Zoom In"
                  icon={<MdAdd />}
                  onClick={() => sendMessage(id, user.id, 'zoom-in', { delta: 5 })}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Fit Board" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Fit Board"
                  icon={<MdZoomOutMap />}
                  onClick={() => sendMessage(id, user.id, 'fit-board')}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Show All Apps" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Show All Apps"
                  icon={<ResetZoomIcon />}
                  onClick={() => {
                    sendMessage(id, user.id, 'fit-apps');
                  }}
                />
              </Tooltip>
            </ButtonGroup>
            <ButtonGroup size="md" isAttached variant="solid" colorScheme="teal" spacing="16">
              <Tooltip placement="bottom" hasArrow={true} label="Shift Up" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Zoom Out"
                  icon={<MdKeyboardArrowUp />}
                  onClick={() => sendMessage(id, user.id, 'shift-up')}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Shift Down" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Zoom In"
                  icon={<MdKeyboardArrowDown />}
                  onClick={() => sendMessage(id, user.id, 'shift-down')}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Shift Left" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Fit Board"
                  icon={<MdKeyboardArrowLeft />}
                  onClick={() => sendMessage(id, user.id, 'shift-left')}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Shift Right" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Show All Apps"
                  icon={<MdKeyboardArrowRight />}
                  onClick={() => sendMessage(id, user.id, 'shift-right')}
                />
              </Tooltip>
            </ButtonGroup>
            <ButtonGroup size="md" isAttached variant="solid" colorScheme="teal" spacing="16">
              <Tooltip placement="bottom" hasArrow={true} label="Hide Menus" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Hide Menus"
                  icon={<MdOutlineContentPasteOff />}
                  onClick={() => sendMessage(id, user.id, 'hide-menus')}
                />
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label="Show Menus" openDelay={400}>
                <IconButton
                  border="solid 1px #2d3748"
                  aria-label="Show Menus"
                  icon={<MdOutlineContentPaste />}
                  onClick={() => sendMessage(id, user.id, 'show-menus')}
                />
              </Tooltip>
            </ButtonGroup>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
