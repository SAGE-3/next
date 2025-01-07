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
  Checkbox,
  Button,
  Icon,
  InputGroup,
  Input,
  InputLeftElement,
  FormHelperText,
} from '@chakra-ui/react';

import { MdAttachFile } from 'react-icons/md';
import { useParams } from 'react-router';
import { apiUrls } from '../../../config';

// Fix the missing attribute 'webkitdirectory' to upload folders
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

interface UploadModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function UploadModal(props: UploadModalProps): JSX.Element {
  // Room and board
  const { roomId } = useParams();

  // selected files
  const [input, setInput] = useState<File[]>([]);
  const [allowFolder, setAllowFolder] = useState(false);

  // Files have been selected
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Object.values(e.target.files) as File[];
      // Ignore .DS_Store and empty files
      const filteredList = files.filter((f: File) => f.name !== '.DS_Store' || f.size === 0);
      setInput(filteredList);
    }
  };
  // To enable/disable folder upload
  const checkFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAllowFolder(e.target.checked);
  };

  // Perform the actual upload
  const upload = () => {
    if (input) {
      // Uploaded with a Form object
      const fd = new FormData();
      // Add each file to the form
      const fileListLength = input.length;
      for (let i = 0; i < fileListLength; i++) {
        fd.append('files', input[i]);
      }

      // Add fields to the upload form
      fd.append('room', roomId!);

      // Upload with a POST request
      fetch(apiUrls.assets.upload, {
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
        <ModalHeader>Upload Assets</ModalHeader>
        <ModalBody>
          <Checkbox mb={4} onChange={checkFolder}>
            Enable folder upload
          </Checkbox>
          <FormControl isRequired>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<Icon as={MdAttachFile} />} />
              {allowFolder ? (
                <Input
                  variant="outline"
                  padding={'4px 35px'}
                  id="files"
                  type="file"
                  multiple
                  webkitdirectory="true"
                  onChange={handleInputChange}
                  onClick={() => setInput([])}
                />
              ) : (
                <Input
                  variant="outline"
                  padding={'4px 35px'}
                  id="files"
                  type="file"
                  // accept={'image/*, video/*, application/pdf, application/json, text/csv, text/plain'} // .ipynb
                  multiple
                  onChange={handleInputChange}
                  onClick={() => setInput([])}
                />
              )}
            </InputGroup>
            <FormHelperText>Select one or more files</FormHelperText>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button type="submit" colorScheme="green" mr={5} onClick={upload} isDisabled={input.length === 0}>
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
