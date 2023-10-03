/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, Button, ModalCloseButton } from '@chakra-ui/react';

import { SAGEColors } from '@sage3/shared';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  size?: string;
  cancelText?: string;
  confirmText?: string;
  cancelColor?: SAGEColors;
  confirmColor?: SAGEColors;
}

/**
 * Confirmation Modal
 * @param props
 * @returns
 */
export function ConfirmModal(props: ConfirmModalProps): JSX.Element {
  const cancelText = props.cancelText || 'Cancel';
  const confirmText = props.confirmText || 'Confirm';
  const cancelButtonColor = props.cancelColor || 'gray';
  const confirmButtonColor = props.confirmColor || 'teal';
  const size = props.size || 'md';
  const initialRef = useRef(null);

  return (
    <Modal size={size} isOpen={props.isOpen} onClose={props.onClose} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{props.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>{props.message}</ModalBody>

        <ModalFooter>
          <Button colorScheme={cancelButtonColor} mr={3} ref={initialRef} onClick={props.onClose}>
            {cancelText}
          </Button>
          <Button colorScheme={confirmButtonColor} onClick={props.onConfirm}>
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
