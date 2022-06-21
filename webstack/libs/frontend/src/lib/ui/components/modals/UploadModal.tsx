/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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

import { useUserStore } from '../../../stores';

import { MdAttachFile } from 'react-icons/md';

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
  const user = useUserStore((state) => state.user);

  // selected files
  const [input, setInput] = useState<File[]>([]);

  // Files have been selected
  const handleInputChange = (e: any) => {
    const files = Object.values(e.target.files) as File[];
    // Ignore .DS_Store and empty files
    const filteredList = files.filter((f: File) => (f.name !== '.DS_Store') || f.size === 0);
    setInput(filteredList);
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
      // Upload with a POST request
      fetch('/api/assets/upload', {
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
  }

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Upload Assets</ModalHeader>
        <ModalBody>
          <FormControl isRequired>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<Icon as={MdAttachFile} />} />
              <Input
                variant="outline"
                id="files"
                type="file"
                accept={'image/*, video/*, application/pdf'}
                multiple
                webkitdirectory="true"
                onChange={handleInputChange}
                onClick={() => setInput([])}
              />
            </InputGroup>

            <FormHelperText>Select one or more images</FormHelperText>

            <br />

            <Button type="submit" onClick={upload}>
              Upload
            </Button>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={props.onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
