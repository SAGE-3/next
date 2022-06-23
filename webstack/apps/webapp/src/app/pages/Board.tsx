/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Select, Text, useDisclosure, useToast, Menu, MenuGroup, MenuItem } from '@chakra-ui/react';


import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName } from '@sage3/applications/schema';

import { useAppStore, useBoardStore, useUserStore } from '@sage3/frontend';
import { AssetModal, UploadModal, ContextMenu } from '@sage3/frontend';

import { sageColorByName } from '@sage3/shared';
import { DraggableData, Rnd } from 'react-rnd';

type LocationParams = {
  boardId: string;
  roomId: string;
};

/**
 * The board page which displays the board and its apps.
 */
export function BoardPage() {
  // Navigation and routing
  const location = useLocation();
  const locationState = location.state as LocationParams;
  const navigate = useNavigate();

  // Board and App Store stuff
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const subBoard = useAppStore((state) => state.subToBoard);
  const unsubBoard = useAppStore((state) => state.unsubToBoard);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === locationState.boardId);

  // User information
  const user = useUserStore((state) => state.user);

  // Asset manager button
  const { isOpen: assetIsOpen, onOpen: assetOnOpen, onClose: assetOnClose } = useDisclosure();
  // Upload modal
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();

  // display some notifications
  const toast = useToast();

  // Board current position
  const [boardPos, setBoardPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Subscribe to the board that was selected
    subBoard(locationState.boardId);
    // Uncmounting of the board page. user must have redirected back to the homepage. Unsubscribe from the board.
    return () => {
      unsubBoard();
    };
  }, []);

  // Redirect the user back to the homepage when he clicks the green button in the top left corner
  function handleHomeClick() {
    navigate('/home');
  }

  // Function to handle when a new app is opened.
  // App is positioned in the middle of the screen for right now.
  const handleNewApp = (event: React.ChangeEvent<HTMLSelectElement>) => {
    // Check if value is corretly set
    const appName = event.target.value as AppName;
    if (!appName) return;

    // Default width and height
    const width = 300;
    const height = 300;

    // Cacluate X and Y of app based on the current board position and the width and height of the viewport
    const x = Math.floor(boardPos.x + window.innerWidth / 2 - width / 2);
    const y = Math.floor(boardPos.y + window.innerHeight / 2 - height / 2);

    // Skip if no user is logged in
    if (!user) return;

    // Create the new app
    createApp({
      name: appName,
      description: `${appName} - Description`,
      roomId: locationState.roomId,
      boardId: locationState.boardId,
      position: { x, y, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      ownerId: user._id,
      state: initialValues[appName] as any,
      minimized: false,
    });
  };

  // On a drag stop of the board. Set the board position locally.
  function handleDragBoardStop(event: any, data: DraggableData) {
    setBoardPos({ x: -data.x, y: -data.y });
  }

  // Perform the actual upload
  const uploadFunction = (input: File[]) => {
    if (input) {
      // Uploaded with a Form object
      const fd = new FormData();
      // Add each file to the form
      const fileListLength = input.length;
      for (let i = 0; i < fileListLength; i++) {
        console.log('Adding file: ', input[i]);
        fd.append('files', input[i]);
      }

      // Add fields to the upload form
      fd.append('room', locationState.roomId);

      // Cacluate X and Y of app based on the current board position and the width and height of the viewport
      const xdrop = Math.floor(boardPos.x + window.innerWidth / 2 - 150);
      const ydrop = Math.floor(boardPos.y + window.innerHeight / 2 - 150);
      fd.append('targetX', xdrop.toString());
      fd.append('targetY', ydrop.toString());

      // Upload with a POST request
      fetch('/api/assets/upload', {
        method: 'POST',
        body: fd,
      })
        .catch((error: Error) => {
          console.log('Upload> Error: ', error);
        })
        .finally(() => {
          // Close the modal UI
          // props.onClose();
          console.log('Upload> Upload complete');
          // Display a message
          toast({
            title: 'Upload Done',
            status: 'info',
            duration: 4000,
            isClosable: true,
          });
        });
    }
  };

  // Start dragging
  function OnDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }
  // Drop event
  function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    console.log('Position:', { x: event.clientX, y: event.clientY });
    if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      // Collect all the files dropped into an array
      collectFiles(event.dataTransfer).then((files) => {
        // do the actual upload
        uploadFunction(Array.from(files));
      });
    } else {
      console.log('drop_handler: no files');
    }
  }

  return (
    <>
      {/* Board. Uses lib react-rnd for drag events.
       * Draggable Background below is the actual target for drag events.*/}
      <Rnd
        default={{
          x: 0,
          y: 0,
          width: 5000,
          height: 5000,
        }}
        onDragStop={handleDragBoardStop}
        enableResizing={false}
        dragHandleClassName={'board-handle'}
      >
        {/* Apps */}
        {apps.map((app) => {
          const Component = Applications[app.data.type];
          return <Component key={app._id} {...app}></Component>;
        })}

        {/* Draggable Background */}
        <Box
          className="board-handle"
          width={5000}
          height={5000}
          backgroundSize={`50px 50px`}
          backgroundImage={`linear-gradient(to right, grey 1px, transparent 1px),
            linear-gradient(to bottom, grey 1px, transparent 1px);`}
          id="board"
          // Drag and drop event handlers
          onDrop={OnDrop}
          onDragOver={OnDragOver}
        />
        <ContextMenu divId="board">
          <Menu>
            <MenuGroup>
              <MenuItem className="contextMenuItem">Fit View to Board</MenuItem>
            </MenuGroup>
          </Menu>
        </ContextMenu>


      </Rnd>

      {/* Top bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} position="absolute" top="0" width="100%">
        {/* Home Button */}
        <Button colorScheme="green" onClick={handleHomeClick}>
          Home
        </Button>

        {/* Board Name */}
        <Text fontSize="3xl" background="teal" px={6} borderRadius="16" color="white">
          {board?.data.name}
        </Text>

        {/* User Avatar */}
        <Avatar size="md" name={user?.data.name} backgroundColor={user ? sageColorByName(user.data.color) : ''} color="black" />
      </Box>

      {/* Bottom Bar */}
      <Box display="flex" justifyContent="left" alignItems="center" p={2} position="absolute" bottom="0">
        {/* App Create Menu */}
        <Select
          colorScheme="green"
          width="200px"
          mx="1"
          background="darkgray"
          placeholder="Open Application"
          onChange={handleNewApp}
          value={0}
        >
          {Object.keys(Applications).map((appName) => (
            <option key={appName} value={appName}>
              {appName}
            </option>
          ))}
        </Select>

        {/* Open the Asset Manager Dialog */}
        <Button colorScheme="green" mx="1" onClick={assetOnOpen}>
          Asset Manager
        </Button>

        {/* Open the Asset Upload Dialog */}
        <Button colorScheme="blue" mx="1" onClick={uploadOnOpen}>
          Upload
        </Button>
      </Box>

      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose} center={boardPos}></AssetModal>

      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>
    </>
  );
}

/**
 * Collects files into an array, from a list of files or folders
 *
 * @export
 * @param {DataTransfer} evdt
 * @returns {Promise<File[]>}
 */
export async function collectFiles(evdt: DataTransfer): Promise<File[]> {
  return new Promise<File[]>((resolve, reject) => {
    const contents: File[] = [];
    let reading = 0;

    function handleFiles(file: File) {
      reading--;
      if (file.name !== '.DS_Store') contents.push(file);
      if (reading === 0) {
        resolve(contents);
      }
    }

    const dt = evdt;
    const length = evdt.items.length;
    for (let i = 0; i < length; i++) {
      const entry = dt.items[i].webkitGetAsEntry();
      if (entry?.isFile) {
        reading++;
        // @ts-ignore
        entry.file(handleFiles);
      } else if (entry?.isDirectory) {
        reading++;
        // @ts-ignore
        const reader = entry.createReader();
        reader.readEntries(function (entries: any) {
          // @ts-ignore
          reading--;
          entries.forEach(function (dir: any, key: any) {
            reading++;
            dir.file(handleFiles);
          });
        });
      }
    }
  });
}
