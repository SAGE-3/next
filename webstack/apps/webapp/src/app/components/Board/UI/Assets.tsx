/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';

import { useAppStore, useUIStore, useAssetStore, useUsersStore } from '@sage3/frontend';
import { FileEntry } from './types';
import { Files } from './Files';

type AssetsProps = {
  opened: boolean;
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
};



export function Assets(props: AssetsProps) {
  // UI store
  const showUI = useUIStore((state) => state.showUI);
  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
  // Hover state
  const [hover, setHover] = useState(false);
  const [showContent, setShowContent] = useState(props.opened);
  // Room and board
  const location = useLocation();
  const { boardId, roomId } = location.state as { boardId: string; roomId: string };
  // Access the list of users
  const users = useUsersStore((state) => state.users);

  const subscribe = useAssetStore((state) => state.subscribe);
  const unsubscribe = useAssetStore((state) => state.unsubscribe);
  const assets = useAssetStore((state) => state.assets);
  const [assetsList, setAssetsList] = useState<FileEntry[]>([]);

  function handleDblClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    setShowContent(!showContent);
  }

  // subscribe to the asset store
  useEffect(() => {
    subscribe();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Filter the asset keys for this room
    const filterbyRoom = assets.filter((k) => k.data.room === roomId);
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
  }, [assets, roomId]);

  if (showUI)
    return (
      <Rnd
        position={{ ...props.position }}
        bounds="parent"
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => {
          setHover(false);
          props.setPosition({ x: data.x, y: data.y });
        }}
        enableResizing={false}
        dragHandleClassName="handle" // only allow dragging the header
        style={{ transition: hover ? 'none' : 'all 0.2s' }}
      >
        <Box
          display="flex"
          boxShadow={"outline"}
          transition="all .2s "
          bg={panelBackground}
          p="2"
          rounded="md"
        >
          <Box
            width="25px"
            backgroundImage={`radial-gradient(${gripColor} 2px, transparent 0)`}
            backgroundPosition="0 0"
            backgroundSize="8px 8px"
            mr="2"
            cursor="move"
            className="handle"
            onDoubleClick={handleDblClick}
          />

          <Box display="flex" flexDirection="column">
            <Text w="100%" textAlign="center" color={textColor} fontSize={18} fontWeight="bold" h={'auto'}
              userSelect={'none'} className="handle" cursor="move" onDoubleClick={handleDblClick}>
              Assets
            </Text>
            <Box alignItems="center" p="1" width={"3xl"} display="flex">
              <Files files={assetsList} show={showContent} />
            </Box>
          </Box>
        </Box>
      </Rnd >
    );
  else return null;
}
