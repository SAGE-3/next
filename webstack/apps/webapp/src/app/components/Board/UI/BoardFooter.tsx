/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Select, useDisclosure } from '@chakra-ui/react';
import { AssetModal, UploadModal, useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName, AppState } from '@sage3/applications/schema';


type FooterProps = {
  boardId: string,
  roomId: string,
};

/**
 * Header component
 *
 * @export
 * @param {HeaderProps} props
 * @returns
 */
export function BoardFooter(props: FooterProps) {
  // User information
  const { user } = useUser();

  // App Store
  const createApp = useAppStore((state) => state.create);
  const apps = useAppStore((state) => state.apps);

  // UI Store
  const selectedApp = useUIStore(state => state.selectedAppId);
  const gridSize = useUIStore((state) => state.gridSize);
  const boardPosition = useUIStore((state) => state.boardPosition);

  // Asset manager button
  const { isOpen: assetIsOpen, onOpen: assetOnOpen, onClose: assetOnClose } = useDisclosure();
  // Upload modal
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();

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
    let x = Math.floor(boardPosition.x + window.innerWidth / 2 - width / 2);
    let y = Math.floor(boardPosition.y + window.innerHeight / 2 - height / 2);
    x = Math.round(x / gridSize) * gridSize; // Snap to grid
    y = Math.round(y / gridSize) * gridSize;

    // Skip if no user is logged in
    if (!user) return;

    // Create the new app
    createApp({
      name: appName,
      description: `${appName} - Description`,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      ownerId: user._id,
      state: initialValues[appName] as AppState,
      minimized: false,
      raised: true
    });
  };

  return (
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

      {/* App Toolbar - TODO - Temporary location for right now*/}
      <Box alignItems="center" mx="1" backgroundColor="gray" p="2">
        {apps
          .filter(el => el._id === selectedApp).map((app) => {
            const Component = Applications[app.data.type].ToolbarComponent;
            return <Component key={app._id} {...app}></Component>;
          })}
      </Box>

      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose} center={boardPosition}></AssetModal>

      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>
    </Box>
  );
}
