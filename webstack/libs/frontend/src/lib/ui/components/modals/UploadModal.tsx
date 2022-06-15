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

interface UploadModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function UploadModal(props: UploadModalProps): JSX.Element {
  const user = useUserStore((state) => state.user);

  // Keyboard handler: press enter to activate command
  // const onSubmit = (e: React.KeyboardEvent) => {
  //   // Keyboard instead of pressing the button
  //   if (e.key === 'Enter') {
  //     updateAccount();
  //   }
  // };

  // selected files
  const [input, setInput] = useState<FileList[]>([]);

  const handleInputChange = (e: any) => {
    setInput(e.target.files);
  };

  const upload = () => {
    const fileArray = input;
    const fd = new FormData();
    for (const file of fileArray) {
      // @ts-ignore
      fd.append('files', file);
    }

    fetch('/api/assets/upload', {
      method: 'POST',
      body: fd,
    })
      .catch((error: Error) => {
        console.log('Upload> Error: ', error);
      })
      .finally(() => {
        props.onClose();
      });
  };

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
