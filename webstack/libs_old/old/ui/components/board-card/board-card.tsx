/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { v5 as uuidv5 } from 'uuid';

import {
  Box,
  Divider,
  Button,
  BoxProps,
  IconButton,
  Skeleton,
  SkeletonText,
  Avatar,
  Tooltip,
  ModalOverlay,
  useDisclosure,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  HStack,
  useToast,
  Text,
  Radio,
  Stack,
  RadioGroup,
  Icon,
  Flex,
  Spacer,
} from '@chakra-ui/react';

import './board-card.module.scss';
import { UserPresence } from '@sage3/shared/types';
import { initials } from '@sage3/frontend/utils/misc/strings';
import { MdSettings, MdLock, MdAdd } from 'react-icons/md';
import { borderColor, cardColor, linkColor, linkHoverColor, S3Modal, textColor } from '@sage3/frontend/ui';
import { useUser } from '@sage3/frontend/services';

export interface BoardCardProps {
  id: string;

  name: string;
  width: number;
  height: number;
  scaleBy: number;
  createTime: Date;
  updateTime: Date;

  ownerName: string;
  ownerId: string;
  isOwner: boolean;

  // private boards
  isPrivate: boolean;
  privatePin: string;

  groups: Record<string, unknown>;

  users: UserPresence[];

  onClickPermissions(): void;
  onDeleteBoard(): void;
  onEdit(boardId: string, boardInfo: boardInfoProps): boolean;
}

export interface boardInfoProps {
  name: string;
  height: number;
  width: number;
  scaleBy: number;
  isPrivate: boolean;
  privatePin: string;
}

export function BoardCard(props: BoardCardProps) {
  return (
    <BaseCard>
      <Flex>
        <EnterBoard {...props} />
        <Spacer />
        <EditBoardModal {...props} />
      </Flex>
      {/* <Divider my={2} /> */}
      {/* <Field textColor={textColor()} name="Updated" value={props.updateTime.toLocaleString()} /> */}
      {/* <Field textColor={textColor()} name="Created" value={props.createTime.toLocaleString()} /> */}
      <Field textColor={textColor()} name="Created" value={props.createTime.toLocaleDateString()} />
      <Field textColor={textColor()} name="Size" value={`${props.width} x ${props.height}`} />
      <Field textColor={textColor()} name="Owner" value={props.isOwner ? 'Mine' : props.ownerName} />

      {/* Divider if any users in th board */}
      {props.users.length > 0 && <Divider my={2} />}

      {/* avatar list inside the board */}
      <Box textAlign="left">
        {props.users.map((user: UserPresence) => {
          const timeZone = user.timeZone;
          const time = new Date(new Date().getTime() + (new Date().getTimezoneOffset() - user.timeOffset) * 60000);
          const usertime = time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
          return (
            <Tooltip
              key={user.id}
              label={`${user.name} | ${usertime} | ${timeZone}`}
              aria-label="A tooltip"
              hasArrow={true}
              placement="bottom-start"
            >
              <Avatar
                key={user.id}
                bg={user.color}
                color="white"
                textShadow={"0 0 2px #000"}
                mr={1}
                mb={1}
                size="sm"
                cursor="pointer"
                showBorder={true}
                borderRadius={user.userType == 'wall' ? '0%' : '100%'}
                borderColor="whiteAlpha.600"
                getInitials={initials}
                name={user.name}
              />
            </Tooltip>
          );
        })}
      </Box>
    </BaseCard>
  );
}

const EnterBoard = (props: BoardCardProps) => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [privateText, setPrivateText] = useState('');
  const toast = useToast();
  const initialRef = React.useRef<HTMLInputElement>(null);

  // Opens modal to input pin if private & go to board if not private
  const handleNavigate = () => {
    if (props.isPrivate) {
      onOpen();
    } else {
      navigate(`/board/${props.id}`);
    }
  };

  // Checks if the user entered pin matches the board pin
  const compareKey = () => {
    // feature of UUID v5: private a key to 'sign' a string
    const sageDomain = '71111d6e-64d8-4eab-953d-f88117f79f9c';
    const key = uuidv5(privateText, sageDomain);

    // compare the hashed keys
    if (key === props.privatePin) {
      navigate(`/board/${props.id}`);
    } else {
      toast({
        title: `The password you have entered is incorrect`,
        status: 'error',
        duration: 4 * 1000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Tooltip hasArrow={true} label={props.name} openDelay={400}>
        <Text
          ml="auto"
          onClick={handleNavigate}
          // replace={true}
          cursor="pointer"
          textAlign="left"
          width="80%"
          textColor={linkColor()}
          _hover={{ textColor: linkHoverColor() }}
          textOverflow="ellipsis"
          fontSize="3xl"
          overflow="hidden"
          isTruncated
        >
          {props.name}
        </Text>
      </Tooltip>

      <S3Modal initialRef={initialRef} size="md" title="Please the Enter the Board Password" isOpen={isOpen} onClose={onClose}>
        <ModalBody>
          <ModalCloseButton />
          <InputGroup>
            <InputLeftAddon children="Password" />
            <Input
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') compareKey();
              }}
              ref={initialRef}
              width="full"
              value={privateText}
              type="password"
              onChange={(e) => setPrivateText(e.target.value)}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" colorScheme="teal" onClick={compareKey}>
            Enter
          </Button>
        </ModalFooter>
      </S3Modal>
    </>
  );
};

const EditBoardModal = (props: BoardCardProps) => {
  const initialRef = React.useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { userRole } = useUser();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [pinChanged, setPinChanged] = useState(false);

  const [boardInfo, setBoardInfo] = useState<boardInfoProps>({
    name: props.name,
    width: props.width,
    scaleBy: props.scaleBy,
    height: props.height,
    isPrivate: props.isPrivate,
    privatePin: props.privatePin,
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.name) {
      case 'name':
        setBoardInfo({ ...boardInfo, name: e.target.value });
        break;
      case 'width':
        setBoardInfo({ ...boardInfo, width: parseInt(e.target.value) });
        break;
      case 'height':
        setBoardInfo({ ...boardInfo, height: parseInt(e.target.value) });
        break;
      case 'privatePin':
        setBoardInfo({ ...boardInfo, privatePin: e.target.value });
        setPinChanged(true);
    }
  };

  return (
    <>
      <Tooltip label={props.isOwner ? 'Edit Board' : 'Only the Board Owner can edit the board.'} placement="top" hasArrow openDelay={400}>
        <div>
          {props.isOwner ? (
            <Icon
              aria-label="edit"
              translateY="15%"
              transform="auto"
              color={linkColor()}
              onClick={onOpen}
              as={MdSettings}
              boxSize={8}
              _hover={{ cursor: 'pointer', color: linkHoverColor() }}
            />
          ) : userRole == 'guest' ? null : (
            <Icon aria-label="edit" translateY="15%" transform="auto" color="#565454" as={MdSettings} boxSize={8} />
          )}
        </div>
      </Tooltip>
      <Tooltip label={'This board is protected.'} placement="top" hasArrow openDelay={400}>
        <div>
          {props.isPrivate ? (
            <Icon aria-label="protected" translateY="15%" transform="auto" color={linkColor()} as={MdLock} boxSize={8} />
          ) : null}
        </div>
      </Tooltip>
      <Modal isCentered blockScrollOnMount={false} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Board</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Board Name</FormLabel>
              <Input name="name" ref={initialRef} value={boardInfo.name} placeholder="Board name..." onChange={handleChange} />
            </FormControl>
            <HStack mt={'1rem'}>
              <InputGroup>
                <InputLeftAddon children="Width" />
                <Input name="width" value={boardInfo.width} type="number" onChange={handleChange} />
              </InputGroup>
              <InputGroup>
                <InputLeftAddon children="Height" />
                <Input name="height" value={boardInfo.height} type="number" onChange={handleChange} />
              </InputGroup>
            </HStack>
            {/* UI scale */}
            <FormControl mt={'1rem'}>
              <FormLabel>User Interface Scale</FormLabel>
              <RadioGroup
                onChange={(choice) =>
                  setBoardInfo((prev) => {
                    return { ...prev, scaleBy: parseInt(choice) };
                  })
                }
                value={boardInfo.scaleBy.toString()}
              >
                <Stack direction="row">
                  <Radio value={'1'}>Tiny</Radio>
                  <Radio value={'2'}>Small</Radio>
                  <Radio value={'3'}>Medium</Radio>
                  <Radio value={'4'}>Large</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {/* Private Board Option */}
            <FormControl mt={'1rem'}>
              <FormLabel>Is this Board Private?</FormLabel>
              <RadioGroup
                name="isPrivate"
                onChange={(choice) =>
                  setBoardInfo((prev) => {
                    return { ...prev, isPrivate: parseInt(choice) === 1 };
                  })
                }
                value={boardInfo.isPrivate ? 1 : 0}
              >
                <Stack direction="row">
                  <Radio value={1}>Yes</Radio>
                  <Radio value={0}>No</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {/* Private Key */}
            {boardInfo.isPrivate ? (
              <FormControl isRequired mt={'1rem'}>
                <FormLabel>Password</FormLabel>
                <Input name="privatePin" ref={initialRef} onChange={handleChange} />
              </FormControl>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <DeleteModal onDeleteBoard={props.onDeleteBoard} name={boardInfo.name} />
            {/* <Button
              mr="1rem"
              size="md"
              variant="outline"
              colorScheme={props.groups.all ? 'red' : 'green'}
              onClick={() => props.onClickPermissions()}
            >
              {props.groups.all ? 'Revoke' : 'Grant'} "All" Access
            </Button> */}
            <Button
              colorScheme="teal"
              variant="outline"
              mr={3}
              onClick={() => {
                onClose();
                if (boardInfo.name) {
                  // Hash the private pin
                  if (pinChanged && boardInfo.isPrivate) {
                    const sageDomain = '71111d6e-64d8-4eab-953d-f88117f79f9c';
                    const key = uuidv5(boardInfo.privatePin, sageDomain);
                    boardInfo.privatePin = key;
                  }
                  const success = props.onEdit(props.id, boardInfo);
                  if (success) {
                    toast({
                      title: `Board ${boardInfo.name} has been updated.`,
                      status: 'success',
                      duration: 2 * 1000,
                      isClosable: true,
                    });
                  } else {
                    toast({
                      title: `Board ${boardInfo.name} could not be updated`,
                      status: 'error',
                      duration: 2 * 1000,
                      isClosable: true,
                    });
                  }
                }
              }}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

/**
 * Custom modal to handle delete modal
 *
 * @param {{ onDeleteBoard(): void, name: string }}  props
 * @returns
 */
const DeleteModal = (props: { onDeleteBoard(): void; name: string }) => {
  //used to handle modal events
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      {/******** Button rendered on board-card to open modal *******/}
      <Button mr="1rem" size="md" variant="outline" colorScheme="red" onClick={onOpen}>
        Delete Board
      </Button>
      <Modal isCentered isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Board</ModalHeader>
          <ModalCloseButton />
          <ModalBody>Are you sure you want to delete board {props.name}?</ModalBody>

          <ModalFooter>
            {/******** Close Modal *******/}
            <Button colorScheme="teal" size="md" variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            {/****** Button that deletes board ********/}
            <Button colorScheme="red" size="md" onClick={() => props.onDeleteBoard()}>
              Yes, Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

function BaseCard(props: BoxProps) {
  return (
    <Box
      position="relative"
      background={cardColor()}
      border={borderColor()}
      w="xs"
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="sm"
      overflow="hidden"
      px={5} py={3}
      mb={2}
    >
      {props.children}
    </Box>
  );
}

function Field(props: { name: string; value: string } & BoxProps) {
  const { name, value, ...rest } = props;

  return (
    <Box as="h4" d="flex" {...rest} fontSize="sm">
      <Box as="span" fontWeight="semibold" mr={2}>
        {name}:
      </Box>
      {value}
    </Box>
  );
}

/**
 * Creating a new board
 *
 * @export
 * @param {{ onCreate(boardInfo: boardInfoProps): boolean }} props
 * @returns
 */
export function InputCard(props: { onCreate(boardInfo: boardInfoProps): boolean }) {
  // Focus on first input element
  const initialRef = React.useRef<HTMLInputElement>(null);
  const [boardInfo, setBoardInfo] = useState<boardInfoProps>({
    name: '',
    width: 8192,
    height: 4608,
    scaleBy: 2,
    isPrivate: false,
    privatePin: '',
  });

  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'inputcard' });
  const toast = useToast();

  useEffect(() => {
    const makeid = (length: number): string => {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'; // removed letter O
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    };
    if (isOpen) {
      setBoardInfo({
        name: '',
        width: 8192,
        height: 4608,
        scaleBy: 2,
        isPrivate: false,
        privatePin: makeid(6),
      });
    }
  }, [isOpen]);

  // Handler for board props
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.name) {
      case 'name':
        setBoardInfo({ ...boardInfo, name: e.target.value });
        break;
      case 'width':
        setBoardInfo({ ...boardInfo, width: parseInt(e.target.value) });
        break;
      case 'height':
        setBoardInfo({ ...boardInfo, height: parseInt(e.target.value) });
        break;
      case 'privatePin':
        setBoardInfo({ ...boardInfo, privatePin: e.target.value });
    }
  };

  return (
    <BaseCard>
      <Box d="flex" justifyContent="center" width="full" height="full" cursor="pointer" onClick={onOpen}>
        <IconButton
          size={'4rem'}
          border="none"
          colorScheme="teal"
          variant="outline"
          alignSelf="center"
          aria-label="Create Board"
          icon={<MdAdd size={'4rem'} />}
        />
        <Modal isCentered blockScrollOnMount={false} isOpen={isOpen} onClose={onClose} initialFocusRef={initialRef}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create a new board</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {/* board name */}
              <FormControl isRequired>
                <FormLabel>Board Name</FormLabel>
                <Input name="name" ref={initialRef} value={boardInfo.name} placeholder="Board name..." onChange={handleChange} />
              </FormControl>

              {/* board size */}
              <FormControl mt={'1rem'}>
                <HStack>
                  <InputGroup>
                    <InputLeftAddon children="Width" />
                    <Input name="width" value={boardInfo.width} type="number" onChange={handleChange} />
                  </InputGroup>
                  <InputGroup>
                    <InputLeftAddon children="Height" />
                    <Input name="height" value={boardInfo.height} type="number" onChange={handleChange} />
                  </InputGroup>
                </HStack>
              </FormControl>

              {/* UI scale */}
              <FormControl mt={'1rem'}>
                <FormLabel>User Interface Scale</FormLabel>
                <RadioGroup
                  onChange={(choice) =>
                    setBoardInfo((prev) => {
                      return { ...prev, scaleBy: parseInt(choice) };
                    })
                  }
                  value={boardInfo.scaleBy.toString()}
                >
                  <Stack direction="row">
                    <Radio value={'1'}>Tiny</Radio>
                    <Radio value={'2'}>Small</Radio>
                    <Radio value={'3'}>Medium</Radio>
                    <Radio value={'4'}>Large</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {/* Private Board Option */}
              <FormControl mt={'1rem'}>
                <FormLabel>Is this Board Private?</FormLabel>
                <RadioGroup
                  name="isPrivate"
                  onChange={(choice) =>
                    setBoardInfo((prev) => {
                      return { ...prev, isPrivate: parseInt(choice) === 1 };
                    })
                  }
                  value={boardInfo.isPrivate ? 1 : 0}
                >
                  <Stack direction="row">
                    <Radio value={1}>Yes</Radio>
                    <Radio value={0}>No</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {/* Private Key */}
              {boardInfo.isPrivate ? (
                <FormControl isRequired mt={'1rem'}>
                  <FormLabel>Password</FormLabel>
                  <Input name="privatePin" ref={initialRef} value={boardInfo.privatePin} onChange={handleChange} />
                </FormControl>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="teal"
                variant="outline"
                mr={3}
                onClick={() => {
                  if (boardInfo.name) {
                    // Hash the private pin
                    if (boardInfo.isPrivate) {
                      const sageDomain = '71111d6e-64d8-4eab-953d-f88117f79f9c';
                      const key = uuidv5(boardInfo.privatePin, sageDomain);
                      boardInfo.privatePin = key;
                    }
                    const success = props.onCreate(boardInfo);
                    if (success) {
                      toast({
                        title: `Board ${boardInfo.name} has been created.`,
                        status: 'success',
                        duration: 2 * 1000,
                        isClosable: true,
                      });
                      boardInfo.name = '';
                      onClose();
                    } else {
                      toast({
                        title: 'Board could not be created.',
                        description: 'All fields must be filled',
                        status: 'error',
                        isClosable: true,
                      });
                    }
                  }
                }}
              >
                Create Board
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </BaseCard>
  );
}

export default BoardCard;
