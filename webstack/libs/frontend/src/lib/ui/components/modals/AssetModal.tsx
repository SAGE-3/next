/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, Button } from '@chakra-ui/react';

import { useAppStore, useAssetStore, useUserStore } from '@sage3/frontend';
import { FileManager } from './filemanager/filemanager';
import { FileEntry, AssetModalProps } from './filemanager/types';

export function AssetModal({ isOpen, onClose }: AssetModalProps): JSX.Element {
  const subscribe = useAssetStore((state) => state.subscribe);
  const unsubscribe = useAssetStore((state) => state.unsubscribe);
  const assets = useAssetStore((state) => state.assets);

  const [assetsList, setAssetsList] = React.useState<FileEntry[]>([]);
  const createApp = useAppStore((state) => state.create);

  // User information
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    subscribe();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Filter the asset keys for this board
    const keys = Object.keys(assets); // .filter((k) => assets[k].boardId === boardId);
    console.log(keys)
    // Create entries
    setAssetsList(
      keys.map((k, idx) => {
        const item = assets[idx];
        const id = item.data.file;
        const fileType = item.data.mimetype.split('/')[1];
        // build an FileEntry object
        const entry: FileEntry = {
          id: id,
          owner: '-',
          filename: item.data.file,
          originalfilename: item.data.originalfilename,
          date: new Date().getTime(),
          dateAdded: new Date(item.data.dateAdded).getTime(),
          boardId: '-',
          size: item.data.size,
          type: fileType,
          derived: item.data.derived,
          exif: null,
          selected: false,
        };
        return entry;
      })
    );
  }, [assets, isOpen]);

  const location = useLocation();
  const { boardId, roomId } = location.state as { boardId: string; roomId: string };

  const openFiles = (files: FileEntry[]) => {
    if (!user) return;
    files.forEach((d) => {
      let url;
      if (d.type === 'jpeg') {
        url = d.derived?.sizes['800'] || d.derived?.fullSize;
        url = (url) ? url : '';
        createApp(
          {
            name: 'Image',
            description: 'Image Description',
            ownerId: user._id,
            roomId,
            boardId,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 300, height: 24 + 300 / (d.derived?.aspectRatio || 1), depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Image',
            state: { url },
            minimized: false,

          }
        );
      }
    });
    onClose();
  };
  const onOpenFiles = () => {
    if (!user) return;
    let x = 0;
    assetsList.forEach((d) => {
      if (d.selected) {
        let url;
        const w = 200;
        if (d.type === 'jpeg') {
          url = d.derived?.sizes['800'] || d.derived?.fullSize;
          url = (url) ? url : '';
          createApp({
            name: 'Image',
            description: 'Image Description',
            roomId,
            boardId,
            ownerId: user._id,
            position: { x: x, y: 0, z: 0 },
            size: { width: w, height: 24 + w / (d.derived?.aspectRatio || 1), depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Image',
            state: { url },
            minimized: false,
          }
          );
          x += w + 10;
        } else if (d.type === 'pdf') {
          // hack for pdfs
          if (d.derived) {
            // @ts-ignore
            const pages = d.derived as any[];
            const page1 = pages[0];
            const k = Object.keys(page1)[0];
            url = page1[k].url;
            url = (url) ? url : '';
            createApp({
              name: 'Image',
              description: 'Image Description',
              roomId,
              boardId,
              ownerId: user._id,
              position: { x: 0, y: 0, z: 0 },
              size: { width: page1[k].width, height: page1[k].height, depth: 0 },
              rotation: { x: x, y: 0, z: 0 },
              type: 'Image',
              state: { url },
              minimized: false,
            }
            );
            x += page1[k].width + 10;
          }
        }
      }
    });
    onClose();
  };

  return (
    <Modal isCentered isOpen={isOpen} onClose={onClose} size={'6xl'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Assets Browser</ModalHeader>
        {/* File manager */}
        <ModalBody userSelect={'none'}>
          <FileManager files={assetsList} openFiles={openFiles} />
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
