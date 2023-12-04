/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Input, VStack, Text,
} from '@chakra-ui/react';

import { SAGEColors } from '@sage3/shared';

interface ConfirmValueModal {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val: string) => void;
  initiaValue: string;
  title: string;
  message: string;
  size?: string;
  cancelText?: string;
  confirmText?: string;
  cancelColor?: SAGEColors;
  confirmColor?: SAGEColors;
}

/**
 * Confirmation Modal for a text value
 * @param props
 * @returns
 */
export function ConfirmValueModal(props: ConfirmValueModal): JSX.Element {
  const cancelText = props.cancelText || 'Cancel';
  const confirmText = props.confirmText || 'Confirm';
  const cancelButtonColor = props.cancelColor || 'gray';
  const confirmButtonColor = props.confirmColor || 'teal';
  const size = props.size || 'md';
  const initialRef = useRef(null);

  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(props.initiaValue);
  }, []);

  const handleSave = useCallback(() => {
    props.onConfirm(value);
    props.onClose();
  }, [value, props]);

  const handleClose = () => {
    props.onClose();
  }

  const onSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Modal size={size} isOpen={props.isOpen} onClose={props.onClose} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{props.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack alignItems={"left"}>
            <Text>{props.message}</Text>
            <Input ref={initialRef}
              defaultValue={value} spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onSubmit}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme={cancelButtonColor} mr={3} onClick={handleClose}>
            {cancelText}
          </Button>
          <Button colorScheme={confirmButtonColor} onClick={handleSave} isDisabled={value === ''}>
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
