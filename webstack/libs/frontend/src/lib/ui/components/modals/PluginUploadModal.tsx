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
  useToast,
  Spinner,
  Box,
} from '@chakra-ui/react';

import { MdAttachFile } from 'react-icons/md';
import { usePluginStore, useUser } from '@sage3/frontend';

import { isZip } from '@sage3/shared';

interface PluginUploadModalProps {
  roomId: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Modal to show the user's plugins and allow them to upload new ones
 * @param props
 * @returns
 */
export function PluginUploadModal(props: PluginUploadModalProps): JSX.Element {
  // Form state
  const [input, setInput] = useState<File[]>([]);

  // Uploading Status
  const [uploading, setUploading] = useState<boolean>(false);

  // User
  const { user } = useUser();

  // List of user's plugins
  const upload = usePluginStore((state) => state.upload);

  // Toast
  const toast = useToast();

  const resetInputFields = () => {
    setInput([]);
  };

  // Perform the actual upload
  const handleUpload = async () => {
    const roomId = props.roomId;
    const selectedFile = input[0];

    // Check for required fields
    if (selectedFile && user && roomId) {
      // Check file extension is a ZIP file
      if (!isZip(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.zip')) {
        toast({
          title: 'Plugin Upload',
          description: 'Invalid file type. (Required: Zip File)',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });

        return;
      }

      // Set uploading to true, shows spinner
      setUploading(true);

      // The store resolves every upload outcome, including network failures.
      const response = await upload(selectedFile, user.data.name, roomId);

        setUploading(false);

        toast({
          title: 'Plugin Upload',
        description: response.success
          ? `${response.message} Boards with owner-approved future-upload trust stay enabled within their capability ceiling. Other changed packages need approval.`
          : response.message,
        status: response.success ? 'success' : 'error',
        duration: 5000,
          isClosable: true,
        });

      if (response.success) {
      resetInputFields();
      }
    } else {
      toast({
        title: 'Plugin Upload',
        description: 'Select a non-empty ZIP package to upload to this room.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Files have been selected
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const nonEmptyFiles = files.filter((file) => file.name !== '.DS_Store' && file.size > 0);

      setInput(nonEmptyFiles);
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Plugin Upload</ModalHeader>
        <ModalBody>
          {uploading ? (
            <Box width="100%" height="220px" display="flex" justifyContent="center">
              <Spinner
                thickness="12px"
                speed="0.65s"
                emptyColor="gray.200"
                color="teal.300"
                size="xl"
                width="220px"
                height="220px"
              />
            </Box>
          ) : (
            <FormControl isRequired>
              <FormHelperText mb="2">
                Select an API v1 ZIP package containing manifest.json and its declared HTML entry and view files. The package name and
                description come from its manifest. Only the original uploader can replace it. Uploads preserve saved data. A changed
                package runs automatically only on boards where the current room owner explicitly trusts future uploads within the approved
                capabilities; otherwise it needs fresh approval. Uploading identical ZIP bytes retains existing approval.
              </FormHelperText>
              <InputGroup>
                <InputLeftElement pointerEvents="none" children={<Icon as={MdAttachFile} />} />

                <Input
                  variant="outline"
                  padding={'4px 35px'}
                  id="files"
                  type="file"
                  accept={'.zip'}
                  onChange={handleInputChange}
                  onClick={() => setInput([])}
                />
                <br />
              </InputGroup>
            </FormControl>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="submit" colorScheme="green" mr={5} onClick={handleUpload} isDisabled={uploading}>
            Upload
          </Button>
          <Button mr={3} onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
