/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  FormControl,
  Button,
  Icon,
  InputGroup,
  Input,
  InputLeftElement,
  FormHelperText,
} from '@chakra-ui/react';

import { MdAttachFile } from 'react-icons/md';

interface PluginUploadModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function PluginUploadModal(props: PluginUploadModalProps): JSX.Element {
  // selected files
  const [input, setInput] = useState<File[]>([]);

  // Files have been selected
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Object.values(e.target.files) as File[];
      // Ignore .DS_Store and empty files
      const filteredList = files.filter((f: File) => f.name !== '.DS_Store' || f.size === 0);
      setInput(filteredList);
    }
  };
  // Perform the actual upload
  const upload = () => {
    if (input) {
      // Uploaded with a Form object
      const fd = new FormData();
      fd.append('plugin', input[0]);
      // Upload with a POST request
      fetch('/api/plugins/upload', {
        method: 'POST',
        body: fd,
      })
        .catch((error: Error) => {
          console.log('Upload> Error: ', error);
        })
        .finally(() => {
          // Close the modal UI
          props.onClose();
        });
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Plugin Upload</ModalHeader>
        <ModalBody>
          <FormControl isRequired>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<Icon as={MdAttachFile} />} />

              <Input
                variant="outline"
                padding={'4px 35px'}
                id="files"
                type="file"
                accept={'.zip'}
                multiple
                onChange={handleInputChange}
                onClick={() => setInput([])}
              />
            </InputGroup>
            <FormHelperText>Select Zip file Container Plugin App</FormHelperText>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button type="submit" colorScheme="green" mr={5} onClick={upload}>
            Upload
          </Button>
          <Button mr={3} onClick={props.onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
