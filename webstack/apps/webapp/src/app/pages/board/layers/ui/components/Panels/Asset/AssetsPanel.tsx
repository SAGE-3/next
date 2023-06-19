/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, Button, useDisclosure, Text, Flex, Divider, Spacer, Tooltip } from '@chakra-ui/react';

import { UploadModal, useAssetStore, useRoomStore, useUsersStore, useAuth, useUser } from '@sage3/frontend';

import { Panel } from '../Panel';
import { Files } from './Files';
import { FileEntry } from './types';
import { SAGE3Ability } from '@sage3/shared';

type AssetsPanelProps = {
  boardId: string;
  roomId: string;
};

/**
 * The asset manager panel
 *
 * @export
 * @param {AssetsPanelProps} props containing the boardId and roomId
 * @returns {JSX.Element}
 */
export function AssetsPanel(props: AssetsPanelProps) {
  // Room Store
  const rooms = useRoomStore((state) => state.rooms);
  const [roomName, setRoomName] = useState('');

  // Clear board modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Access the list of users
  const users = useUsersStore((state) => state.users);
  const { auth } = useAuth();
  const { user } = useUser();

  // Ablities
  const canUpload = SAGE3Ability.can(user?.data.userRole, 'upload', 'assets');

  const subscribe = useAssetStore((state) => state.subscribe);
  const unsubscribe = useAssetStore((state) => state.unsubscribe);
  const assets = useAssetStore((state) => state.assets);
  const [assetsList, setAssetsList] = useState<FileEntry[]>([]);

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

  return (
    <>
      <Panel title={`Assets available in Room "${roomName}"`} name="assets" width={817} showClose={false}>
        <Box display="flex" flexDirection="column">
          <Box alignItems="center" p="1" width={'3xl'} display="flex">
            <Files files={assetsList} />
          </Box>
          <Divider p={0} mt={1} mb={2} />
          <Flex>
            <Text fontSize={'xs'}>To add assets, drag-drop files onto the board or click the 'Upload' button to upload a folder</Text>
            <Spacer />

            <Tooltip
              placement="top-start"
              label={auth?.provider === 'guest' ? 'Guests cannot upload assets' : 'Upload assets'}
              openDelay={500}
              hasArrow
            >
              <Button
                colorScheme="green"
                width="100px"
                size={'xs'}
                onClick={onOpen}
                // Block guests from uploading assets
                isDisabled={!canUpload}
              >
                Upload
              </Button>
            </Tooltip>
          </Flex>
        </Box>
      </Panel>
      {/* Upload dialog */}
      <UploadModal isOpen={isOpen} onOpen={onOpen} onClose={onClose}></UploadModal>
    </>
  );
}
