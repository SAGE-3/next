/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useRef, useEffect } from 'react';

// Date manipulation functions for file manager
import { format as formatDate } from 'date-fns';
import { AssetHTTPService } from '@sage3/frontend';

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody,
  Box, Button, Flex,
  useEventListener, useDisclosure, Portal,
  useColorMode, useColorModeValue, useToast,
} from '@chakra-ui/react';

// Icons for file types
import { MdOutlinePictureAsPdf, MdOutlineImage, MdOutlineFilePresent, MdOndemandVideo, MdOutlineStickyNote2 } from 'react-icons/md';

import { humanFileSize, downloadFile, useUser } from '@sage3/frontend';
import { getExtension } from '@sage3/shared';
import { useUsersStore } from '@sage3/frontend';
import { ExifViewer } from './exifviewer';
import { RowFileProps } from './types';

/**
 * Component diplaying one file in a row
 * Can be selected with a click
 * Change background color on hover
 * @param p FileEntry
 * @returns
 */
export function RowFile({ file, clickCB }: RowFileProps) {
  // check if user is a guest
  const { user } = useUser();

  const toast = useToast();
  // Store if the file is selected or not
  const [selected, setSelected] = useState(file.selected);
  const buttonRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  // Modal showing file information
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'exif' });
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure({ id: 'delete' });
  // show the context menu
  const [showMenu, setShowMenu] = useState(false);
  const [dragImage, setDragImage] = useState<HTMLImageElement>();
  // Access the list of users
  const users = useUsersStore((state) => state.users);

  // dark/light modes
  const { colorMode } = useColorMode();

  // Select the file when clicked
  const onSingleClick = (e: MouseEvent): void => {
    // Flip the value
    setSelected((s) => !s);
    clickCB(file);
    if (showMenu) setShowMenu(false);
  };
  // Select the file when double-clicked
  // const onDoubleClick = (e: MouseEvent): void => {
  //   dbclickCB(file);
  // };

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
    } else if (id === 'info') {
      // open a panel showing EXIF data
      onOpen();
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

  // useEffect(() => {
  //   const button = buttonRef.current;
  //   button?.addEventListener('dblclick', onDoubleClick);
  //   return () => {
  //     button?.removeEventListener('dblclick', onDoubleClick);
  //   }
  // }, [buttonRef]);

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

  // find the owner of the file, given the user ID
  const owner = users.find((el) => el._id === file.owner);

  const dragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragImage) {
      e.dataTransfer.setDragImage(dragImage, 2, 2);
    }
  };

  return (
    <div ref={divRef}>
      <Flex bg={highlight} _hover={{ background: hover }} ref={buttonRef} fontFamily="mono"
        alignItems="center" draggable={true} onDragStart={dragStart}>
        <Box w="30px">{whichIcon(extension)}</Box>
        <Box flex="1" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
          {file.originalfilename}
        </Box>
        <Box w="120px" textAlign="right">
          {owner?.data.name.substring(0, 12) || '-'}
        </Box>
        <Box w="110px" textAlign="center">
          {extension}
        </Box>
        <Box w="110px" textAlign="right">
          {modif}
        </Box>
        <Box w="110px" textAlign="right">
          {added}
        </Box>
        <Box w="110px" textAlign="right" pr={2}>
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
            }}
          >
            <li className="s3contextmenuitem" id={'del'} onClick={actionClick}>
              Delete
            </li>
            <li className="s3contextmenuitem" id={'down'} onClick={actionClick}>
              Download
            </li>
            <hr className="divider" />
            <li className="s3contextmenuitem" id={'info'} onClick={actionClick}>
              Info
            </li>
          </ul>
        </Portal>
      ) : (
        <> </>
      )}

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

      {/* EXIF info */}
      <Modal closeOnEsc={true} closeOnOverlayClick={true} isOpen={isOpen} onClose={onClose} size={'3xl'} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>EXIF Metadata Viewer</ModalHeader>
          <ModalBody>
            {/* Read-only ace editor showing the JSON data */}
            <ExifViewer file={file} colorMode={colorMode} />
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
