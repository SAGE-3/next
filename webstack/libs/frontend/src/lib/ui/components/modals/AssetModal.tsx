/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

// Fetcher for the file list
import useSWR from 'swr'

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, Button,
} from '@chakra-ui/react';

import { AssetType, AssetSB } from '@sage3/shared/types';
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

  if (error) { return <div>Failed to load</div> }
  if (!data) { return <div>Loading...</div> }

  return (
    <Modal isCentered isOpen={isOpen} onClose={onClose} size={'6xl'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Assets Browser</ModalHeader>
        {/* File manager */}
        <ModalBody userSelect={'none'}>
          <FileManager files={data} />
        </ModalBody>
        <ModalFooter>
          {/* <Button colorScheme="blue" mr={3} onClick={onOpenFiles}>
            Open File(s)
          </Button> */}
          <Button mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
