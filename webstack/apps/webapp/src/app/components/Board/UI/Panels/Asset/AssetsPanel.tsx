/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, Button, useDisclosure, Text, Flex, Divider, Spacer, Tooltip } from '@chakra-ui/react';

import { StuckTypes, UploadModal, useAssetStore, useRoomStore, useUIStore, useUsersStore, useAuth } from '@sage3/frontend';

import { Panel } from '../Panel';
import { Files } from './Files';
import { FileEntry } from './types';

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
  const position = useUIStore((state) => state.assetsPanel.position);
  const setPosition = useUIStore((state) => state.assetsPanel.setPosition);
  const opened = useUIStore((state) => state.assetsPanel.opened);
  const setOpened = useUIStore((state) => state.assetsPanel.setOpened);
  const show = useUIStore((state) => state.assetsPanel.show);
  const setShow = useUIStore((state) => state.assetsPanel.setShow);
  const stuck = useUIStore((state) => state.assetsPanel.stuck);
  const setStuck = useUIStore((state) => state.assetsPanel.setStuck);
  const zIndex = useUIStore((state) => state.panelZ).indexOf('assets');
  const rooms = useRoomStore((state) => state.rooms);
  const controllerPosition = useUIStore((state) => state.controller.position);
  const [roomName, setRoomName] = useState('');
  // Clear board modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Access the list of users
  const users = useUsersStore((state) => state.users);
  const { auth } = useAuth();

  const subscribe = useAssetStore((state) => state.subscribe);
  const unsubscribe = useAssetStore((state) => state.unsubscribe);
  const assets = useAssetStore((state) => state.assets);
  const [assetsList, setAssetsList] = useState<FileEntry[]>([]);

  // if a menu is currently closed, make it "jump" to the controller
  useEffect(() => {
    if (!show) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
      setStuck(StuckTypes.Controller);
    }
  }, [show]);

  useEffect(() => {
    if (stuck == StuckTypes.Controller) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
    }
  }, [controllerPosition]);

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
    const keys = Object.keys(filterbyRoom);
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
      <Panel
        title={`Assets available in Room "${roomName}"`}
        name="assets"
        opened={opened}
        setOpened={setOpened}
        setPosition={setPosition}
        position={position}
        width={817}
        showClose={true}
        show={show}
        setShow={setShow}
        stuck={stuck}
        setStuck={setStuck}
        zIndex={zIndex}
      >
        <Box display="flex" flexDirection="column">
          <Box alignItems="center" p="1" width={'3xl'} display="flex">
            <Files files={assetsList} />
          </Box>
          <Divider p={0} mt={1} mb={2} />
          <Flex>
            <Text fontSize={'xs'}>To add assets, drag-drop files onto the board or click the 'Upload' button to upload a folder</Text>
            <Spacer />

            <Tooltip placement="top-start" label={auth?.provider === 'guest' ? "Guests cannot upload assets" : "Upload assets"} openDelay={500} hasArrow>
              <Button colorScheme="green" width="100px" size={'xs'} onClick={onOpen}
                // Block guests from uploading assets
                disabled={auth?.provider === 'guest'}>
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
