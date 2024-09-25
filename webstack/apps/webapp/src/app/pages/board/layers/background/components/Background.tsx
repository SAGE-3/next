/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Box, useColorModeValue, useToast, ToastId, useDisclosure } from '@chakra-ui/react';
import { throttle } from 'throttle-debounce';

import {
  useUIStore,
  useAppStore,
  useUser,
  useHexColor,
  useMessageStore,
  useHotkeys,
  useCursorBoardPosition,
  useKeyPress,
  setupApp,
  HelpModal,
} from '@sage3/frontend';

import { useDragAndDropBoard } from './DragAndDropBoard';
import { InteractionbarShortcuts } from '../../ui/components';

type BackgroundProps = {
  roomId: string;
  boardId: string;
};

export function Background(props: BackgroundProps) {
  // display some notifications
  const toast = useToast();
  // Handle to a toast
  const toastIdRef = useRef<ToastId>();
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

  // Drag and Drop On Board
  const { dragProps, renderContent } = useDragAndDropBoard({ roomId: props.roomId, boardId: props.boardId });

  // Messsages
  const subMessage = useMessageStore((state) => state.subscribe);
  const unsubMessage = useMessageStore((state) => state.unsubscribe);
  const message = useMessageStore((state) => state.lastone);

  // How to create some applications
  const createApp = useAppStore((state) => state.create);

  // User
  const { user } = useUser();
  const { cursor, boardCursor } = useCursorBoardPosition();

  // UI Store
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);
  const scale = useUIStore((state) => state.scale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const boardSynced = useUIStore((state) => state.boardSynced);
  // Chakra Color Mode for grid color
  const gc = useColorModeValue('gray.100', 'gray.700');
  const gridColor = useHexColor(gc);

  // Subscribe to messages
  useEffect(() => {
    subMessage();
    return () => {
      unsubMessage();
    };
  }, []);

  // Get the last new message
  useEffect(() => {
    if (!user) return;
    if (message && message._createdBy === user._id) {
      const title = message.data.type.charAt(0).toUpperCase() + message.data.type.slice(1);
      // Update the toast if we can
      if (toastIdRef.current) {
        toast.update(toastIdRef.current, {
          title: title,
          description: message.data.payload,
          duration: 5000,
          isClosable: true,
        });
      } else {
        // or create a new one
        toastIdRef.current = toast({
          title: title,
          description: message.data.payload,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [message]);

  // Question mark character for help
  useHotkeys(
    'shift+/',
    (event: KeyboardEvent): void | boolean => {
      if (!user) return;
      // Open the help panel
      helpOnOpen();
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [] }
  );

  // Move the board with the arrow keys
  useHotkeys(
    'up, down, left, right',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      const shiftAmount = 50 / scale; // Grid size adjusted for scale factor
      if (event.key === 'ArrowUp') {
        setBoardPosition({ x: boardPosition.x, y: boardPosition.y + shiftAmount });
      } else if (event.key === 'ArrowDown') {
        setBoardPosition({ x: boardPosition.x, y: boardPosition.y - shiftAmount });
      } else if (event.key === 'ArrowLeft') {
        setBoardPosition({ x: boardPosition.x + shiftAmount, y: boardPosition.y });
      } else if (event.key === 'ArrowRight') {
        setBoardPosition({ x: boardPosition.x - shiftAmount, y: boardPosition.y });
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [selectedAppId, boardPosition.x, boardPosition.y] }
  );

  // Zoom in/out of the board with the -/+ keys
  useHotkeys(
    '-, =',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      if (event.key === '-') {
        zoomOutDelta(-10, cursor);
      } else if (event.key === '=') {
        zoomInDelta(10, cursor);
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [selectedAppId] }
  );

  // Throttle stickie hotkey event
  const throttleStickieCreation = throttle(1000, (x: number, y: number) => {
    if (!user) return;
    createApp(
      setupApp(user.data.name, 'Stickie', x, y, props.roomId, props.boardId, { w: 400, h: 420 }, { color: user.data.color || 'yellow' })
    );
  });
  const throttleStickieCreationRef = useCallback(throttleStickieCreation, [user]);

  // Stickies Shortcut
  useHotkeys(
    'shift+s',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      if (boardSynced) {
        const x = boardCursor.x;
        const y = boardCursor.y;
        throttleStickieCreationRef(x, y);
        // Returning false stops the event and prevents default browser events
        return false;
      } else {
        toast({
          title: 'Creating Sticky while panning or zooming is not supported',
          status: 'warning',
          duration: 2000,
          isClosable: true,
        });
      }
    },
    // Depends on the cursor to get the correct position
    { dependencies: [] }
  );

  // Deselect Application by clicking on board
  function handleDeselect() {
    if (selectedApp) {
      setSelectedApp('');
    }

    if (setSelectedAppsIds.length > 0) {
      setSelectedAppsIds([]);
    }
  }

  return (
    <Box
      className="board-handle"
      width="100%"
      height="100%"
      backgroundSize={'100px 100px'}
      bgImage={`linear-gradient(to right, ${gridColor} ${1 / scale}px, transparent ${1 / scale
        }px), linear-gradient(to bottom, ${gridColor} ${1 / scale}px, transparent ${1 / scale}px);`}
      id="board"
      userSelect={'none'}
      draggable={false}
      cursor={'grab'}
      sx={{
        '&:active': {
          cursor: 'grabbing',
        },
      }}
      // Drag and drop event handlers
      {...dragProps}
      onClick={handleDeselect}
    >
      <HelpModal onClose={helpOnClose} isOpen={helpIsOpen}></HelpModal>
      {renderContent()}

      {/* Interaction Shortcuts */}
      <InteractionbarShortcuts />
    </Box>
  );
}
