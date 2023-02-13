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
  Text,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Box,
  VStack,
  CardBody,
  Card,
  useToast,
} from '@chakra-ui/react';

import { MdAttachFile } from 'react-icons/md';
import { useHexColor, usePluginStore, useUser } from '@sage3/frontend';

interface PluginUploadModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function PluginModal(props: PluginUploadModalProps): JSX.Element {
  // selected files
  const [input, setInput] = useState<File[]>([]);

  // User
  const { user } = useUser();

  // List of user's plugins
  const { plugins, delete: deletePlugin, upload } = usePluginStore((state) => state);
  const userPlugins = plugins.filter((p) => p.data.creatorId === user?._id);

  // UI
  const borderColor = useHexColor('teal');

  // Toast
  const toast = useToast();

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
  const handleUpload = async () => {
    if (input) {
      // Upload with a POST request
      const response = await upload(input[0]);
      console.log(response);
      if (response.success) {
        toast({
          title: 'Plugin Upload',
          description: 'Plugin Successfully Uploaded.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({ title: 'Plugin Upload', description: response.message, status: 'warning', duration: 3000, isClosable: true });
      }
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Plugin Upload</ModalHeader>
        <ModalBody>
          <Box mb="4">
            <Text>Your Plugins</Text>
            <VStack spacing={4}>
              {userPlugins
                // create a button for each application
                .map((plugin) => {
                  const name = plugin.data.name.charAt(0).toUpperCase() + plugin.data.name.slice(1);
                  return (
                    <Card key={plugin._id} width="100%" background="gray" border="solid 2px" borderColor={borderColor} p="0" m="1">
                      <CardBody p="1" display="flex" justifyContent="space-between" alignItems="center">
                        <Text>{name}</Text>
                        <Button colorScheme="red" size="xs" color="white" onClick={() => deletePlugin(plugin._id)}>
                          X
                        </Button>
                      </CardBody>
                    </Card>
                  );
                })}
            </VStack>
          </Box>

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
          <Button type="submit" colorScheme="green" mr={5} onClick={handleUpload}>
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
