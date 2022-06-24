/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, Button } from '@chakra-ui/react';

import { useAppStore, useAssetStore, useUserStore } from '@sage3/frontend';
import { FileManager } from './filemanager/filemanager';
import { FileEntry, AssetModalProps } from './filemanager/types';

import { initialValues } from '@sage3/applications/apps';
import { ExtraImageType } from '@sage3/shared/types';

export function AssetModal({ isOpen, onClose, center }: AssetModalProps): JSX.Element {
  const subscribe = useAssetStore((state) => state.subscribe);
  const unsubscribe = useAssetStore((state) => state.unsubscribe);
  const assets = useAssetStore((state) => state.assets);

  const [assetsList, setAssetsList] = React.useState<FileEntry[]>([]);
  const createApp = useAppStore((state) => state.create);

  // Room and board
  const location = useLocation();
  const { boardId, roomId } = location.state as { boardId: string; roomId: string };

  // Use the center of the board passed through props
  const [dropPos, setDropPos] = useState(center);
  // Track the browser window size
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    setDropPos({
      x: Math.floor(center.x + windowSize.width / 2 - 150),
      y: Math.floor(center.y + windowSize.height / 2 - 150)
    });
  }, [center, windowSize]);

  // Listen to the window size changes
  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // User information
  const user = useUserStore((state) => state.user);

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
        let fileType = item.data.mimetype.split('/')[1];
        if (fileType === 'octet-stream') fileType = 'data';
        // build an FileEntry object
        const entry: FileEntry = {
          id: id,
          owner: user?._id || '-',
          filename: item.data.file,
          originalfilename: item.data.originalfilename,
          date: new Date().getTime(),
          dateAdded: new Date(item.data.dateAdded).getTime(),
          room: item.data.room,
          size: item.data.size,
          type: fileType,
          derived: item.data.derived,
          metadata: item.data.metadata,
          selected: false,
        };
        return entry;
      })
    );
  }, [assets, isOpen]);

  const onOpenFiles = () => {
    if (!user) return;
    let x = 0;
    assetsList.forEach((d) => {
      if (d.selected) {
        const w = 200;
        if (d.type === 'jpeg' || d.type === 'png') {
          const extras = d.derived as ExtraImageType;
          createApp({
            name: 'ImageViewer',
            description: 'Image Description',
            roomId,
            boardId,
            ownerId: user._id,
            position: { ...dropPos, z: 0 },
            size: { width: w, height: 24 + w / (extras.aspectRatio || 1), depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'ImageViewer',
            state: { ...initialValues['ImageViewer'], id: d.id },
            minimized: false,
          });
          x += w + 10;
        } else if (d.type === 'pdf') {
          createApp({
            name: 'PDFViewer',
            description: 'PDF Description',
            roomId,
            boardId,
            ownerId: user._id,
            position: { ...dropPos, z: 0 },
            size: { width: 400, height: 400 * (22 / 17), depth: 0 },
            rotation: { x: x, y: 0, z: 0 },
            type: 'PDFViewer',
            state: { ...initialValues['PDFViewer'], id: d.id },
            minimized: false,
          });
          x += 400 + 10;
        }
      }
    });
    onClose();
  };

  return (
    <Modal isCentered isOpen={isOpen} onClose={onClose} size={'6xl'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Asset Browser</ModalHeader>
        {/* File manager */}
        <ModalBody userSelect={'none'}>
          <FileManager files={assetsList} />
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onOpenFiles}>
            Open File(s)
          </Button>
          <Button mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
