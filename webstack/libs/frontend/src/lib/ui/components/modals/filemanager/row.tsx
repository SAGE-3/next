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

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody,
  Box, Button, Flex,
  useEventListener, useDisclosure, Portal,
  useColorMode, useColorModeValue, useToast,
} from '@chakra-ui/react';

// Icons for file types
import { MdOutlinePictureAsPdf, MdOutlineImage, MdOutlineFilePresent, MdOndemandVideo, MdOutlineStickyNote2 } from 'react-icons/md';
import { RowFileProps } from './types';

import { useUserStore } from '../../../../stores';
import { humanFileSize, downloadFile } from '@sage3/frontend';
import { ExifViewer } from './exifviewer';

/**
 * Component diplaying one file in a row
 * Can be selected with a click
 * Change background color on hover
 * @param p FileEntry
 * @returns
 */
export function RowFile({ file, style, clickCB, dbclickCB }: RowFileProps) {
  // check if user is a guest
  const user = useUserStore((state) => state.user);

  const toast = useToast();
  // Store if the file is selected or not
  const [selected, setSelected] = useState(file.selected);
  const buttonRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  // Modal showing file information
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'exif' });
  // show the context menu
  // const [showMenu, setShowMenu] = useState(false);

  // dark/light modes
  const { colorMode } = useColorMode();

  // Select the file when clicked
  const onSingleClick = (e: MouseEvent): void => {
    // Flip the value
    setSelected((s) => !s);
    clickCB(file);
    // if (showMenu) setShowMenu(false);
  };
  // Select the file when double-clicked
  const onDoubleClick = (e: MouseEvent): void => {
    dbclickCB(file);
  };

  // Context menu selection handler
  const actionClick = (e: React.MouseEvent<HTMLLIElement>): void => {
    const id = e.currentTarget.id;
    if (id === 'down') {
      // download a file
      downloadFile('api/assets/' + file.filename, file.originalfilename);
    } else if (id === 'del') {
      if (user?.userRole !== 'guest') {
        // Delete a file
        // httpGET('/api/content/asset/delete/' + file.id);
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
    // setShowMenu(false);
  };

  useEffect(() => {
    const button = buttonRef.current;
    button?.addEventListener('click', onSingleClick);
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
    // setShowMenu(false);
    if (divRef.current?.contains(e.target as any)) {
      // capture the cursor position to show the menu
      setAnchorPoint({ x: e.pageX, y: e.pageY });
      // show context menu
      // setShowMenu(true);
      setSelected(true);
    }
    e.preventDefault();
  });

  // pick an icon based on file type (extension string)
  const whichIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
      case 'JPEG':
        return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
      case 'MP4':
        return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
      case 'JSON':
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

  return (
    <div ref={divRef} style={{ ...style }}>
      <Flex bg={highlight} _hover={{ background: hover }} ref={buttonRef} fontFamily="mono" alignItems="center">
        <Box w="30px">{whichIcon(file.type)}</Box>
        <Box flex="1" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
          {file.originalfilename}
        </Box>
        <Box w="120px" textAlign="right">
          {file.owner.substring(0, 12)}
        </Box>
        <Box w="110px" textAlign="center">
          {file.type}
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
      {/* {showMenu ? (
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
      )} */}

      {/* EXIF info */}
      <Modal closeOnEsc={true} closeOnOverlayClick={true} isOpen={isOpen} onClose={onClose} size={'3xl'} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Asset Browser</ModalHeader>
          <ModalBody>

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
