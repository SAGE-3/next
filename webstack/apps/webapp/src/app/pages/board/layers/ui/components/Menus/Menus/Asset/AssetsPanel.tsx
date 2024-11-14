/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Button, useDisclosure, Text, Flex, Divider, Spacer, Tooltip } from '@chakra-ui/react';

import { UploadModal, useAssetStore, useRoomStore, useUsersStore, useAbility } from '@sage3/frontend';

import { FileEntry } from '@sage3/shared/types';

import { Files } from './Files';

type AssetsMenuProps = {
  boardId: string;
  roomId: string;
  downloadRoomAssets: (ids: string[]) => void;
};

/**
 * The asset manager panel
 *
 * @export
 * @param {AssetsPanelProps} props containing the boardId and roomId
 * @returns {JSX.Element}
 */
export function AssetsMenu(props: AssetsMenuProps) {
  // Room Store
  const rooms = useRoomStore((state) => state.rooms);
  const [roomName, setRoomName] = useState('');

  // Clear board modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Access the list of users
  const users = useUsersStore((state) => state.users);

  // Ablities
  const canUpload = useAbility('upload', 'assets');
  const canDowload = useAbility('download', 'assets');

  const subscribe = useAssetStore((state) => state.subscribe);
  const unsubscribe = useAssetStore((state) => state.unsubscribe);
  const assets = useAssetStore((state) => state.assets);
  const [assetsList, setAssetsList] = useState<FileEntry[]>([]);
  // List of selected assets: receive from the Files component
  const [ids, setIds] = useState<string[]>([]);

  // subscribe to the asset store
  useEffect(() => {
    subscribe();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Get the room name
    setRoomName(rooms.find((el) => el._id === props.roomId)?.data.name ?? 'Main Room');
    // Filter the asset keys for this room
    const filterbyRoom = assets.filter((k) => k.data.room === props.roomId);
    // Create entries
    setAssetsList(
      filterbyRoom.map((item) => {
        // build an FileEntry object
        const entry: FileEntry = {
          id: item._id,
          owner: item.data.owner,
          ownerName: users.find((el) => el._id === item.data.owner)?.data.name || '-',
          filename: item.data.file,
          originalfilename: item.data.originalfilename,
          date: new Date(item.data.dateCreated).getTime(),
          dateAdded: new Date(item.data.dateAdded).getTime(),
          room: item.data.room,
          size: item.data.size,
          type: item.data.mimetype,
          derived: item.data.derived,
          metadata: item.data.metadata,
          selected: false,
        };
        return entry;
      })
    );
  }, [assets, props.roomId]);

  // Download assets: all if none selected, selected ones if some are selected
  const downloadRoomAssets = useCallback(() => {
    if (ids.length > 0) {
      props.downloadRoomAssets(ids);
    } else {
      const ids = assetsList.map((a) => a.id);
      props.downloadRoomAssets(ids);
    }
  }, [ids]);

  // Update the list of selected assets from the Files component
  const newSelection = (ids: string[]) => {
    setIds(ids);
  };

  return (
    <>
      <Box display="flex" flexDirection="column">
        <Box alignItems="center" p="1" width={'3xl'} display="flex">
          <Files files={assetsList} setSelection={newSelection} />
        </Box>
        <Divider p={0} mt={1} mb={2} />
        <Flex>
          <Text fontSize={'xs'}>To add assets, drag-drop files onto the board or click the 'Upload' button to upload a folder</Text>
          <Spacer />

          <Tooltip
            placement="top-start"
            label={!canDowload ? 'You cannot download assets' : 'Download selected or all assets'}
            openDelay={500}
            hasArrow
          >
            <Button
              colorScheme="green"
              width="80px"
              size={'xs'}
              onClick={downloadRoomAssets}
              // Block guests from downloading assets
              isDisabled={!canDowload || assetsList.length === 0}
            >
              Download
            </Button>
          </Tooltip>

          <Tooltip placement="top-start" label={!canUpload ? 'You cannot upload assets' : 'Upload new assets'} openDelay={500} hasArrow>
            <Button
              colorScheme="green"
              width="80px"
              size={'xs'}
              ml={2}
              onClick={onOpen}
              // Block guests from uploading assets
              isDisabled={!canUpload}
            >
              Upload
            </Button>
          </Tooltip>
        </Flex>
      </Box>
      {/* Upload dialog */}
      <UploadModal isOpen={isOpen} onOpen={onOpen} onClose={onClose}></UploadModal>
    </>
  );
}
