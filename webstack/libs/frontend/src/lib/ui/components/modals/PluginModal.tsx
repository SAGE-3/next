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
  Box,
  VStack,
  CardBody,
  Card,
  useToast,
  useDisclosure,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';

import { MdAttachFile, MdDescription, MdOutlineDriveFileRenameOutline } from 'react-icons/md';
import { ConfirmModal, useHexColor, usePluginStore, useUser } from '@sage3/frontend';

import { format } from 'date-fns';
import { isZip } from '@sage3/shared';

interface PluginUploadModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function sanitizeFilename(filename: string) {
  const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // Remove any invalid characters
  const sanitizedFilename = [...filename].filter((char) => validChars.includes(char)).join('');
  return sanitizedFilename;
}

/**
 * Modal to show the user's plugins and allow them to upload new ones
 * @param props
 * @returns
 */
export function PluginModal(props: PluginUploadModalProps): JSX.Element {
  // Form state
  const [input, setInput] = useState<File[]>([]);
  const [description, setDescription] = useState<string>('');
  const [name, setName] = useState<string>('');

  // Uploading Status
  const [uploading, setUploading] = useState<boolean>(false);

  // Delete Selected Plugin
  const [deleteId, setDeleteId] = useState<string>('');

  // User
  const { user } = useUser();

  // List of user's plugins
  const { plugins, delete: deletePlugin, upload } = usePluginStore((state) => state);
  const userPlugins = plugins.filter((p) => p.data.ownerId === user?._id);

  // UI
  const backgroundColor = useColorModeValue('white', 'gray.600');
  const borderColor = useHexColor('teal');

  // Toast
  const toast = useToast();

  // Delete Confirmation  Modal
  const { isOpen: delConfirmIsOpen, onOpen: delConfirmOnOpen, onClose: delConfirmOnClose } = useDisclosure();

  const resetInputFields = () => {
    setName('');
    setDescription('');
    setInput([]);
  };

  // Perform the actual upload
  const handleUpload = async () => {
    // Check for required fields
    if (input[0] && user && name && description) {
      // Check file extension is a ZIP file
      if (!isZip(input[0].type)) {
        toast({
          title: 'Plugin Upload',
          description: 'Invalid file type. (Required: Zip File)',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        resetInputFields();
        return;
      }
      // Set uploading to true, shows spinner
      setUploading(true);
      // Upload with a POST request
      const response = await upload(input[0], name, description, user.data.name);
      // Upload Successful
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
      // Show spinner for just a little longer so it doesnt look like UI is flashing.
      setTimeout(() => setUploading(false), 500);
      resetInputFields();
    } else {
      toast({
        title: 'Plugin Upload',
        description: 'Missing input fields. (Required: Zip File, Name, and Description)',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Files have been selected
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Object.values(e.target.files) as File[];
      // Ignore .DS_Store and empty files
      const filteredList = files.filter((f: File) => f.name !== '.DS_Store' || f.size === 0);
      setInput(filteredList);
      // Pre-populate the name and description fields with the filename
      setName(sanitizeFilename(filteredList[0].name.split('.')[0]));
      setDescription(sanitizeFilename(filteredList[0].name.split('.')[0]));
    }
  };

  // Handle the description change from the form
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  // Handle the name change from the form
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(sanitizeFilename(e.target.value));
  };

  // Handle the delete button
  const handleDeletePlugin = () => {
    deletePlugin(deleteId);
    delConfirmOnClose();
  };

  return (
    <>
      <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Plugins</ModalHeader>
          <ModalBody>
            <Text fontSize="lg" mb="2">
              Your Plugins
            </Text>
            <Box mb="8">
              <VStack
                spacing={2}
                maxHeight="250px"
                overflow="hidden"
                overflowY="scroll"
                px="1"
                css={{
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'gray',
                    borderRadius: '4px',
                  },
                }}
              >
                {userPlugins
                  // create a button for each application
                  .map((plugin) => {
                    const name = plugin.data.name.charAt(0).toUpperCase() + plugin.data.name.slice(1);
                    const date = format(new Date(Number(plugin.data.dateCreated)), 'MM/dd/yyyy hh:mm');
                    return (
                      <Card
                        key={plugin._id}
                        width="100%"
                        background={backgroundColor}
                        border="solid 3px"
                        borderColor={borderColor}
                        px="1"
                        py="0"
                        boxShadow={'md'}
                      >
                        <CardBody p="1" display="flex" justifyContent="space-between" alignItems="center">
                          <Box width="90%" overflow="none">
                            <Text overflow="hidden" whiteSpace="nowrap" fontWeight="bold" fontSize="14px">
                              {name}
                            </Text>
                            <Text overflow="hidden" whiteSpace="nowrap" fontSize="12px">
                              {plugin.data.description}
                            </Text>
                            <Text overflow="hidden" whiteSpace="nowrap" fontSize="12px">
                              {date}
                            </Text>
                          </Box>
                          <Button
                            colorScheme="red"
                            size="xs"
                            color="white"
                            onClick={() => {
                              setDeleteId(plugin._id);
                              delConfirmOnOpen();
                            }}
                          >
                            X
                          </Button>
                        </CardBody>
                      </Card>
                    );
                  })}
              </VStack>
            </Box>
            <hr style={{ margin: '8px 0 8px 0' }} />
            <Text fontSize="lg">Upload</Text>
            {uploading ? (
              <Box width="100%" height="220px" display="flex" justifyContent="center">
                <Spinner thickness="12px" speed="0.65s" emptyColor="gray.200" color="teal.300" size="xl" width="220px" height="220px" />
              </Box>
            ) : (
              <FormControl isRequired>
                <FormHelperText mb="2">Select Zip file containing a plugin</FormHelperText>
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

                <FormHelperText mb="2">Plugin Name (only letters and numbers, maximum 20 characters)</FormHelperText>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" children={<Icon as={MdOutlineDriveFileRenameOutline} />} />

                  <Input
                    variant="outline"
                    padding={'4px 35px'}
                    id="name"
                    type="text"
                    value={name}
                    placeholder="name"
                    _placeholder={{ opacity: 0.5, color: 'gray.300' }}
                    autoComplete="off"
                    maxLength={20}
                    pattern="[A-Za-z0-9]+"
                    onChange={handleNameChange}
                  />
                </InputGroup>

                <FormHelperText mb="2">Plugin Description (maximum 40 characters)</FormHelperText>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" children={<Icon as={MdDescription} />} />

                  <Input
                    variant="outline"
                    padding={'4px 35px'}
                    id="description"
                    type="text"
                    value={description}
                    placeholder="description"
                    _placeholder={{ opacity: 0.5, color: 'gray.300' }}
                    maxLength={40}
                    autoComplete="off"
                    onChange={handleDescriptionChange}
                  />
                </InputGroup>
              </FormControl>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="submit" colorScheme="green" mr={5} onClick={handleUpload}>
              Upload
            </Button>
            <Button mr={3} onClick={props.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ConfirmModal
        isOpen={delConfirmIsOpen}
        onClose={delConfirmOnClose}
        onConfirm={handleDeletePlugin}
        title="Delete Plugin"
        message="Are you sure you want to delete this plugin?"
        cancelText="Cancel"
        confirmText="Delete"
        confirmColor="red"
      ></ConfirmModal>
    </>
  );
}
