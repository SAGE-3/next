/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Date manipulation functions for file manager
import { format as formatDate } from 'date-fns';
import { AssetHTTPService } from '@sage3/frontend';

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody,
  Box, Button, Flex,
  useEventListener, useDisclosure, Portal,
  useColorModeValue, useToast, Tooltip,
} from '@chakra-ui/react';

// Icons for file types
import { MdOutlinePictureAsPdf, MdOutlineImage, MdOutlineFilePresent, MdOndemandVideo, MdOutlineStickyNote2 } from 'react-icons/md';

import { humanFileSize, downloadFile, useUser, useAppStore, useUIStore } from '@sage3/frontend';
import { getExtension } from '@sage3/shared';
// File information
import { isImage, isPDF, isCSV, isText, isJSON } from '@sage3/shared';
import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';
import { initialValues } from '@sage3/applications/apps';
import { AppState } from '@sage3/applications/schema';


import { FileEntry } from './types';

export type RowFileProps = {
  file: FileEntry;
  clickCB: (p: FileEntry, shift: boolean, modif: boolean) => void;
  dragCB: (e: React.DragEvent<HTMLDivElement>) => void;
};

/**
* Component diplaying one file in a row
* Can be selected with a click
* Change background color on hover
* @param p FileEntry
* @returns
*/
export function RowFile({ file, clickCB, dragCB }: RowFileProps) {
  // check if user is a guest
  const { user } = useUser();

  const toast = useToast();
  // Store if the file is selected or not
  const [selected, setSelected] = useState(file.selected);
  const buttonRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  // Modal for delete
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure({ id: 'delete' });
  // show the context menu
  const [showMenu, setShowMenu] = useState(false);
  const [dragImage, setDragImage] = useState<HTMLImageElement>();
  // How to create some applications
  const createApp = useAppStore((state) => state.create);
  // Room and board
  const location = useLocation();
  const { boardId, roomId } = location.state as { boardId: string; roomId: string };
  // UI Store
  const boardPosition = useUIStore((state) => state.boardPosition);

  // Select the file when clicked
  const onSingleClick = (e: MouseEvent): void => {
    // @ts-expect-error
    const ismac = navigator.userAgentData.platform === 'macOS';
    const modifier = ismac ? e.metaKey : e.ctrlKey;
    clickCB(file, e.shiftKey, modifier);
    if (showMenu) setShowMenu(false);
  };

  useEffect(() => {
    setSelected(file.selected);
    // hide context menu
    setShowMenu(false);
  }, [file]);

  // Context menu selection handler
  const actionClick = (e: React.MouseEvent<HTMLLIElement>): void => {
    const id = e.currentTarget.id;
    if (id === 'down') {
      // download a file
      downloadFile('api/assets/static/' + file.filename, file.originalfilename);
    } else if (id === 'del') {
      if (user?.data.userRole !== 'guest') {
        // Delete a file
        onDeleteOpen();
      } else {
        toast({
          title: 'Guests cannot delete assets',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
      }
    }
    // deselect file selection
    setSelected(false);
    // hide context menu
    setShowMenu(false);
  };

  useEffect(() => {
    const button = buttonRef.current;
    button?.addEventListener('click', onSingleClick);

    // Build the drag image for the file
    const img = new Image();
    img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FkZDhlNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSJub25lIiBkPSJNMCAwaDI0djI0SDBWMHoiLz48cGF0aCBkPSJNMTQgMkg2Yy0xLjEgMC0yIC45LTIgMnYxNmMwIDEuMS45IDIgMiAyaDEyYzEuMSAwIDItLjkgMi0yVjhsLTYtNnptNCAxOEg2VjRoOHY0aDR2MTJ6bS02LTNjLTEuMSAwLTItLjktMi0yVjkuNWMwLS4yOC4yMi0uNS41LS41cy41LjIyLjUuNVYxNWgyVjkuNWEyLjUgMi41IDAgMCAwLTUgMFYxNWMwIDIuMjEgMS43OSA0IDQgNHM0LTEuNzkgNC00di00aC0ydjRjMCAxLjEtLjkgMi0yIDJ6Ii8+PC9zdmc+";
    setDragImage(img);

    return () => {
      button?.removeEventListener('click', onSingleClick);
    }
  }, [divRef]);

  // Context menu handler (right click)
  useEventListener('contextmenu', (e) => {
    // deselect file selection
    setSelected(false);
    // hide context menu
    setShowMenu(false);
    if (divRef.current?.contains(e.target as any)) {
      // capture the cursor position to show the menu
      setAnchorPoint({ x: e.pageX, y: e.pageY });
      // show context menu
      setShowMenu(true);
      setSelected(true);
    }
    e.preventDefault();
  });

  // pick an icon based on file type (extension string)
  const whichIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
      case 'jpeg':
        return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
      case 'mp4':
        return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
      case 'json':
        return <MdOutlineStickyNote2 style={{ color: 'darkgray' }} size={'20px'} />;
      default:
        return <MdOutlineFilePresent size={'20px'} />;
    }
  };

  // Generate a human readable string from date
  const modif = formatDate(new Date(file.date), 'MM/dd/yyyy');
  const added = formatDate(new Date(file.dateAdded), 'MM/dd/yyyy');
  // Select the color when item is selected
  const highlight = selected ? 'teal.600' : 'inherit';
  const colorHover = useColorModeValue('gray.400', 'gray.600');
  const hover = selected ? highlight : colorHover;
  const bgColor = useColorModeValue('#EDF2F7', '#4A5568');
  const border = useColorModeValue('1px solid #4A5568', '1px solid #E2E8F0');
  const extension = getExtension(file.type);

  const dragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragImage) {
      e.dataTransfer.setDragImage(dragImage, 2, 2);
    }
    // call drag callback in the parent
    dragCB(e);
  };

  // Create an app for a file
  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!user) return;
    const w = 400;
    // Get around  the center of the board
    const xDrop = Math.floor(boardPosition.x + window.innerWidth / 2 - w / 2);
    const yDrop = Math.floor(boardPosition.y + window.innerHeight / 2);
    if (isImage(file.type)) {
      // Look for the file in the asset store
      const extras = file.derived as ExtraImageType;
      createApp({
        name: 'ImageViewer',
        description: 'Image Description',
        roomId: roomId,
        boardId: boardId,
        ownerId: user._id,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: w, height: w / (extras.aspectRatio || 1), depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...initialValues['ImageViewer'], id: file.id },
        minimized: false,
        raised: true
      });
    } else if (isCSV(file.type)) {
      createApp({
        name: 'CVSViewer',
        description: 'CSV Description',
        roomId: roomId,
        boardId: boardId,
        ownerId: user._id,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'CSVViewer',
        state: { ...initialValues['CSVViewer'], id: file.id },
        minimized: false,
        raised: true
      });
    } else if (isText(file.type)) {
      // Look for the file in the asset store
      const localurl = '/api/assets/static/' + file.filename;
      // Get the content of the file
      fetch(localurl, {
        headers: {
          'Content-Type': 'text/csv',
          Accept: 'text/csv'
        },
      }).then(function (response) {
        return response.text();
      }).then(async function (text) {
        // Create a note from the text
        createApp({
          name: 'Stickie',
          description: 'Stickie',
          roomId: roomId,
          boardId: boardId,
          ownerId: user._id,
          position: { x: xDrop, y: yDrop, z: 0 },
          size: { width: 400, height: 400, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Stickie',
          state: { ...initialValues['Stickie'] as AppState, text },
          minimized: false,
          raised: true
        });
      });
    } else if (isJSON(file.type)) {
      // Look for the file in the asset store
      const localurl = '/api/assets/static/' + file.filename;
      // Get the content of the file
      fetch(localurl, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
      }).then(function (response) {
        return response.json();
      }).then(async function (spec) {
        // Create a note from the text
        createApp({
          name: 'VegaLite',
          description: 'VegaLite> ' + file.originalfilename,
          roomId: roomId,
          boardId: boardId,
          ownerId: user._id,
          position: { x: xDrop, y: yDrop, z: 0 },
          size: { width: 500, height: 600, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'VegaLite',
          state: { ...initialValues['VegaLite'], spec: JSON.stringify(spec, null, 2) },
          minimized: false,
          raised: true
        });
      });
    } else if (isPDF(file.type)) {
      // Look for the file in the asset store
      const pages = file.derived as ExtraPDFType;
      let aspectRatio = 1;
      if (pages) {
        // First page
        const page = pages[0];
        // First image of the page
        aspectRatio = page[0].width / page[0].height;
      }
      createApp({
        name: 'PDFViewer',
        description: 'PDF Description',
        roomId: roomId,
        boardId: boardId,
        ownerId: user._id,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 400, height: 400 / aspectRatio, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'PDFViewer',
        state: { ...initialValues['PDFViewer'], id: file.id },
        minimized: false,
        raised: true
      });
    }
  }

  return (
    <div ref={divRef}>
      <Flex bg={highlight} _hover={{ background: hover }} ref={buttonRef} fontFamily="mono"
        alignItems="center" draggable={true} onDragStart={dragStart} onDoubleClick={onDoubleClick}>
        <Box w="30px">{whichIcon(extension)}</Box>
        <Tooltip hasArrow label={file.originalfilename} placement="auto" openDelay={500}>
          <Box flex="1" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
            {file.originalfilename}
          </Box>
        </Tooltip>
        <Box w="100px" textAlign="right">
          {file.ownerName.substring(0, 12) || '-'}
        </Box>
        <Box w="80px" textAlign="right">
          {extension}
        </Box>
        <Box w="100px" textAlign="right">
          {modif}
        </Box>
        <Box w="100px" textAlign="right">
          {added}
        </Box>
        <Box w="90px" textAlign="right" pr={2}>
          {humanFileSize(file.size)}
        </Box>
      </Flex>
      {showMenu ? (
        <Portal>
          <ul
            className="s3contextmenu"
            style={{
              top: anchorPoint.y,
              left: anchorPoint.x,
              background: bgColor,
              border: border,
              fontSize: "0.75rem"
            }}
          >
            <li className="s3contextmenuitem" id={'del'} onClick={actionClick}>
              Delete
            </li>
            <li className="s3contextmenuitem" id={'down'} onClick={actionClick}>
              Download
            </li>
          </ul>
        </Portal>
      ) : (null)}

      {/* Delete a file modal */}
      <Modal isCentered isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Asset</ModalHeader>
          <ModalBody>Are you sure you want to delete "{file.originalfilename}" ?</ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" size="md" variant="outline" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              size="md"
              onClick={() => {
                AssetHTTPService.del(file.id);
                onDeleteClose();
              }}
            >
              Yes, Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
