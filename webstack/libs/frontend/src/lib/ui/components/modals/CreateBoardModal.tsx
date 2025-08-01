/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  InputGroup,
  InputLeftElement,
  Input,
  useToast,
  Button,
  Checkbox,
  Text,
  Tooltip,
  HStack,
} from '@chakra-ui/react';

import { v5 as uuidv5 } from 'uuid';
import { MdPerson, MdLock } from 'react-icons/md';

import { useUser } from '@sage3/frontend';
import { BoardSchema } from '@sage3/shared/types';
import { SAGEColors, randomSAGEColor, generateReadableID, isAlphanumericWithSpacesAndForeign } from '@sage3/shared';

import { useBoardStore, useConfigStore } from '../../../stores';
import { ColorPicker } from '../general';

interface CreateBoardModalProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

export function CreateBoardModal(props: CreateBoardModalProps): JSX.Element {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  const { user, saveBoard } = useUser();
  const toast = useToast();

  const createBoard = useBoardStore((state) => state.create);
  const boards = useBoardStore((state) => state.boards);

  const [name, setName] = useState<BoardSchema['name']>('');
  const [isProtected, setProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [roomID, setRoomID] = useState('');
  const [color, setColor] = useState('red' as SAGEColors);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleColorChange = (color: SAGEColors) => setColor(color);

  // Pending create board sever reponse useState
  const [pendingCreate, setPendingCreate] = useState(false);

  // Run on every open of the dialog
  useEffect(() => {
    // Generate a PIN
    const makeid = (length: number): string => {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'; // removed letter O
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    };
    setPassword(makeid(6));
    setRoomID(generateReadableID());
    // Reset the form fields
    setName('');
    setColor(randomSAGEColor());
    setProtected(false);
  }, [props.isOpen]);

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      create();
    }
  };

  const create = async () => {
    if (name  && user) {
      // remove leading and trailing space, and limit name length to 32
      const cleanedName = name.trim().substring(0, 31);
      // list of board names in the room
      const roomsBoards = boards.filter((board) => board.data.roomId === props.roomId);
      const boardNames = roomsBoards.map((board) => board.data.name);

      if (cleanedName.split(' ').join('').length === 0) {
        toast({
          title: 'Name must have at least one character',
          status: 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      } else if (boardNames.includes(cleanedName)) {
        // board name already exists
        toast({
          title: 'Board name already exists',
          status: 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      } else if (!isAlphanumericWithSpacesAndForeign(cleanedName)) {
        toast({
          title: 'Name must only contain Unicode letters, numbers, comma, hyphen, underscore and spaces',
          status: 'error',
          duration: 3 * 1000,
          isClosable: true,
        });
      } else {
        // hash the PIN: the namespace comes from the server configuration
        const key = uuidv5(password, config.namespace);
        // set the pending state to true so that the button is disabled
        setPendingCreate(true);
        // Create the board
        const board = await createBoard({
          name: cleanedName,
          description: 'description',
                    roomId: props.roomId,
          ownerId: user._id,
          color: color,
          isPrivate: isProtected,
          code: roomID,
          privatePin: isProtected ? key : '',
          executeInfo: { executeFunc: '', params: {} },
        });
        if (board) {
          toast({
            title: 'Board created successfully',
            status: 'success',
            duration: 2 * 1000,
            isClosable: true,
          });
          // Save the board to the user's starred boards
          if (saveBoard) {
            saveBoard(board._id);
          }
        } else {
          toast({
            title: 'Board creation failed',
            status: 'error',
            duration: 2 * 1000,
            isClosable: true,
          });
        }
        setPendingCreate(false);
        props.onClose();
      }
    }
  };

  // To enable/disable
  const checkProtected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProtected(e.target.checked);
  };
  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // Copy the board id to the clipboard
  const handleCopyId = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(roomID);
      toast({
        title: 'Success',
        description: `BoardID Copied to Clipboard`,
        duration: 3000,
        isClosable: true,
        status: 'success',
      });
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Create a New Board</ModalHeader>
        <ModalBody>
          <InputGroup mb="4">
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={'Board Name'}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={0}
              value={name}
              onChange={handleNameChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
          
          <ColorPicker selectedColor={color} onChange={handleColorChange}></ColorPicker>

          <Checkbox mt={1} mr={4} onChange={checkProtected} defaultChecked={isProtected}>
            Board Protected with a Password
          </Checkbox>
          <InputGroup mt={2}>
            <InputLeftElement pointerEvents="none" children={<MdLock size={'24px'} />} />
            <Input
              type="text"
              autoCapitalize="off"
              placeholder={'Set Password'}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={password}
              onChange={handlePassword}
              isRequired={isProtected}
              isDisabled={!isProtected}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="green"
            onClick={() => create()}
            isDisabled={!name  || (isProtected && !password) || pendingCreate}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
