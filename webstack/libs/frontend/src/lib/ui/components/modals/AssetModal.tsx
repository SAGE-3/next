/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

// Fetcher for the file list
import useSWR from 'swr'

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, Button,
} from '@chakra-ui/react';

import { AssetType, AssetSB } from '@sage3/shared/types';
import { useAppStore } from '@sage3/frontend';
import { FileManager } from './filemanager/filemanager';
import { FileEntry, AssetModalProps } from './filemanager/types';


const fetcher = (url: string) => {
  return fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }).then(async (r) => {
    const { data } = await r.json();
    const assets = data as AssetSB[];
    console.log('Assets: ', assets);
    // Filter the asset keys for this board
    const keys = Object.keys(assets); // .filter((k) => assets[k].boardId === boardId);
    // Create entries
    const assetList = keys.map((k, idx) => {
      const id = assets[idx]._id;
      const item: AssetType = assets[idx].data;
      const fileType = item.mimetype.split('/')[1];
      // build an FileEntry object
      const entry: FileEntry = {
        id: id,
        owner: '-',
        filename: item.file,
        originalfilename: item.originalfilename,
        date: new Date().getTime(),
        dateAdded: new Date(item.dateAdded).getTime(),
        boardId: '-',
        size: item.size,
        type: fileType,
        derived: item.derived,
        exif: null,
        selected: false,
      };
      return entry;
    });
    return assetList;
  });
}


export function AssetModal({ isOpen, onClose }: AssetModalProps): JSX.Element {
  const { data, error } = useSWR('/api/assets', fetcher);

  const location = useLocation();
  const { boardId, roomId } = location.state as { boardId: string; roomId: string; };
  const createApp = useAppStore((state) => state.create);

  if (error) { return <div>Failed to load</div> }
  if (!data) { return <div>Loading...</div> }

  const openFiles = (files: FileEntry[]) => {
    console.log('openFiles: ', files);
    files.forEach((d) => {
      let url;
      if (d.type === 'jpeg') {
        url = d.derived?.sizes['800'] || d.derived?.fullSize;
        createApp(
          'Image', 'Image Description',
          roomId, boardId,
          { x: 0, y: 0, z: 0 },
          { width: 300, height: 24 + 300 / (d.derived?.aspectRatio || 1), depth: 0 },
          { x: 0, y: 0, z: 0 },
          'Image',
          // state
          {
            url
          }
        );
      }
    });
    onClose();
  }
  const onOpenFiles = () => {
    let x = 0;
    data.forEach((d) => {
      if (d.selected) {
        let url;
        const w = 200;
        if (d.type === 'jpeg') {
          url = d.derived?.sizes['800'] || d.derived?.fullSize;
          createApp(
            'Image', 'Image Description',
            roomId, boardId,
            { x: 0, y: 0, z: 0 },
            { width: w, height: 24 + w / (d.derived?.aspectRatio || 1), depth: 0 },
            { x: x, y: 0, z: 0 },
            'Image',
            // state
            {
              url
            }
          );
          x += w + 10;
          console.log(x)
        } else if (d.type === 'pdf') {
          // hack for pdfs
          if (d.derived) {
            // @ts-ignore
            const pages = d.derived as any[];
            const page1 = pages[0];
            const k = Object.keys(page1)[0];
            url = page1[k].url;

            createApp(
              'Image', 'Image Description',
              roomId, boardId,
              { x: 0, y: 0, z: 0 },
              { width: page1[k].width, height: page1[k].height, depth: 0 },
              { x: x, y: 0, z: 0 },
              'Image',
              // state
              {
                url
              }
            );
            x += page1[k].width + 10;
          }
        }

      }
    });
    onClose();
  }

  return (
    <Modal isCentered isOpen={isOpen} onClose={onClose} size={'6xl'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Assets Browser</ModalHeader>
        {/* File manager */}
        <ModalBody userSelect={'none'}>
          <FileManager files={data} openFiles={openFiles} />
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
