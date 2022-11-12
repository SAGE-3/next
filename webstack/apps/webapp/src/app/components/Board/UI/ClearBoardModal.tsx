/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';

type ClearBoardProps = {
  onClick: () => void;
  onClose: () => void;
  isOpen: boolean;
};

export function ClearBoardModal(props: ClearBoardProps) {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Clear the Board</ModalHeader>
        <ModalBody>Are you sure you want to CLEAR the board?</ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
            Cancel
          </Button>
          <Button colorScheme="red" size="sm" onClick={props.onClick}>
            Yes, Clear the Board
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
