/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Box, Button, useDisclosure } from '@chakra-ui/react';
import { StuckTypes, UploadModal, useAssetStore, useUIStore, useUsersStore } from '@sage3/frontend';

import { Panel } from '../Panel';
import { Files } from './Files';
import { FileEntry } from '../../types';

type AssetsPanelProps = {
  boardId: string;
  roomId: string;
};

export function AssetsPanel(props: AssetsPanelProps) {
  const position = useUIStore((state) => state.assetsMenu.position);
  const setPosition = useUIStore((state) => state.assetsMenu.setPosition);
  const opened = useUIStore((state) => state.assetsMenu.opened);
  const setOpened = useUIStore((state) => state.assetsMenu.setOpened);
  const show = useUIStore((state) => state.assetsMenu.show);
  const setShow = useUIStore((state) => state.assetsMenu.setShow);
  const stuck = useUIStore((state) => state.assetsMenu.stuck);
  const setStuck = useUIStore((state) => state.assetsMenu.setStuck);

  const controllerPosition = useUIStore((state) => state.controller.position);

  // Clear boar modal
  const { isOpen, onOpen, onClose } = useDisclosure();

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

  // Access the list of users
  const users = useUsersStore((state) => state.users);

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
    // Filter the asset keys for this room
    const filterbyRoom = assets.filter((k) => k.data.room === props.roomId);
    const keys = Object.keys(filterbyRoom);
    // Create entries
    setAssetsList(
      keys.map((k, idx) => {
        const item = assets[idx];
        const id = item._id;
        // build an FileEntry object
        const entry: FileEntry = {
          id: id,
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
        title="Assets"
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
      >
        <Box display="flex" flexDirection="column">
          <Box alignItems="center" p="1" width={'3xl'} display="flex">
            <Files files={assetsList} />
          </Box>
          <Box display="flex" justifyContent="right" width="100%">
            <Button colorScheme="green" width="100px" size={'sm'} mb="1">
              Upload
            </Button>
          </Box>
        </Box>
      </Panel>
      {/* Upload dialog */}
      <UploadModal isOpen={isOpen} onOpen={onOpen} onClose={onClose}></UploadModal>
    </>
  );
}
