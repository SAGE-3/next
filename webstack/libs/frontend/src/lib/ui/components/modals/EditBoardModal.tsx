/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */ /**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  Text,
  Box,
  Select,
  ButtonGroup,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';
import { Board, BoardSchema } from '@sage3/shared/types';
import { useBoardStore } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';

interface EditBoardModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  board: Board;
}

export function EditBoardModal(props: EditBoardModalProps): JSX.Element {
  const [name, setName] = useState<BoardSchema['name']>(props.board.data.name);
  const [description, setEmail] = useState<BoardSchema['description']>(props.board.data.description);
  const [color, setColor] = useState<BoardSchema['color']>(props.board.data.color);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value);
  const handleColorChange = (color: string) => setColor(color);

  const deleteBoard = useBoardStore((state) => state.delete);
  const updateBoard = useBoardStore((state) => state.update);

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);
  // useEffect(() => {
  //   initialRef.current?.select();
  // }, [initialRef.current]);

  const setRef = useCallback((_node: HTMLInputElement) => {
    if (initialRef.current) {
      initialRef.current.select();
    }
  }, []);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (name !== props.board.data.name) {
      updateBoard(props.board._id, { name });
    }
    if (description !== props.board.data.description) {
      updateBoard(props.board._id, { description });
    }
    if (color !== props.board.data.color) {
      updateBoard(props.board._id, { color });
    }
    props.onClose();
  };

  const handleDeleteBoard = () => {
    deleteBoard(props.board._id);
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Edit Board: {props.board.data.name}</ModalHeader>
        <ModalBody>
          <InputGroup mb={2}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={props.board.data.name}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={name}
              onChange={handleNameChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
          <InputGroup my={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              type="text"
              placeholder={props.board.data.description}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>

          <ButtonGroup isAttached size="xs" colorScheme="teal" py="2">
            {/* Colors */}
            {SAGEColors.map((s3color) => {
              return (
                <Button
                  key={s3color.name}
                  value={s3color.name}
                  bgColor={s3color.value}
                  _hover={{ background: s3color.value, opacity: 0.7, transform: 'scaleY(1.3)' }}
                  _active={{ background: s3color.value, opacity: 0.9 }}
                  size="md"
                  onClick={() => handleColorChange(s3color.name)}
                  border={s3color.name === color ? '3px solid white' : 'none'}
                  width="43px"
                />
              );
            })}
          </ButtonGroup>
        </ModalBody>
        <ModalFooter pl="4" pr="8" mb="2">
          <Box display="flex" justifyContent="space-between" width="100%">
            <Button colorScheme="red" onClick={handleDeleteBoard} disabled={!name || !description} mx="2">
              Delete
            </Button>
            <Button colorScheme="green" onClick={handleSubmit} disabled={!name || !description}>
              Update
            </Button>
          </Box>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
