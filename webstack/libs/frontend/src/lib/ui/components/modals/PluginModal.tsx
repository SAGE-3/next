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
  Checkbox,
  CheckboxGroup,
  Grid,
  GridItem,
} from '@chakra-ui/react';

import { MdAttachFile, MdDescription, MdOutlineDriveFileRenameOutline } from 'react-icons/md';
import { ConfirmModal, useHexColor, usePluginStore, useRoomStore, useUser } from '@sage3/frontend';

import { format } from 'date-fns';
import { isZip } from '@sage3/shared';
import { Room } from '@sage3/shared/types';

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
  const [allRooms, setAllRooms] = useState<boolean>(false);
  const [rooms, setRooms] = useState<string[]>([]);

  // Uploading Status
  const [uploading, setUploading] = useState<boolean>(false);

  // Delete Selected Plugin
  const [deleteId, setDeleteId] = useState<string>('');

  // User
  const { user } = useUser();

  // Get the user's rooms
  const availableRooms = useRoomStore((state) => state.rooms);
  const members = useRoomStore((state) => state.members);

  // List of user's plugins
  const plugins = usePluginStore((state) => state.plugins);
  const deletePlugin = usePluginStore((state) => state.delete);
  const upload = usePluginStore((state) => state.upload);
  const userPlugins = plugins.filter((p) => p.data.ownerId === user?._id);

  // UI
  const backgroundColor = useColorModeValue('white', 'gray.600');
  const borderColor = useHexColor('teal');

  // Toast
  const toast = useToast();

  // Filter and sort
  const roomMemberFilter = (room: Room): boolean => {
    if (!user) return false;
    const userId = user._id;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    const isOwner = room.data.ownerId === userId;
    return isMember || isOwner;
  };
  const roomsSort = (a: Room, b: Room): number => {
    if (a.data.name < b.data.name) {
      return -1;
    }
    if (a.data.name > b.data.name) {
      return 1;
    }
    return 0;
  };

  const handleRoomClick = (room: Room) => {
    if (rooms.includes(room._id)) {
      setRooms(rooms.filter((r) => r !== room._id));
    } else {
      setRooms([...rooms, room._id]);
    }
  };

  // Delete Confirmation  Modal
  const { isOpen: delConfirmIsOpen, onOpen: delConfirmOnOpen, onClose: delConfirmOnClose } = useDisclosure();

  const resetInputFields = () => {
    setName('');
    setDescription('');
    setInput([]);
  };

  // Perform the actual upload
  const handleUpload = async () => {
    console.log(rooms);
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

                <FormHelperText mb="2">Plugin Room Availability</FormHelperText>
                {/* Check box to select all rooms, if not then show the checkboxgroup */}
                <Box display="flex" width="100%" justifyContent={'left'} mb="2">
                  {' '}
                  <Checkbox
                    isChecked={allRooms}
                    onChange={(e) => setAllRooms(e.target.checked)}
                    size="md"
                    fontWeight={'bold'}
                    colorScheme="teal"
                  >
                    All Rooms
                  </Checkbox>
                </Box>

                {/* Room Selection if not availabe everywhere */}
                {!allRooms && (
                  <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                    {availableRooms
                      .filter(roomMemberFilter)
                      .sort(roomsSort)
                      .map((room) => {
                        const selected = rooms.includes(room._id);
                        const color = useHexColor('teal');
                        return (
                          <GridItem colSpan={1} key={room._id}>
                            <Box
                              onClick={() => handleRoomClick(room)}
                              height="40px"
                              width="170px"
                              border={`solid 2px ${selected ? color : 'gray'}`}
                              borderRadius={'md'}
                              whiteSpace={'none'}
                              overflow={'hidden'}
                              textOverflow={'ellipsis'}
                              display="flex"
                              flexDir={'column'}
                              alignItems="center"
                              justifyContent="center"
                              cursor="pointer"
                              px="4px"
                            >
                              <Text userSelect={'none'}>{room.data.name}</Text>
                            </Box>
                          </GridItem>
                        );
                      })}

                    <GridItem colSpan={3}></GridItem>
                  </Grid>
                )}
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
