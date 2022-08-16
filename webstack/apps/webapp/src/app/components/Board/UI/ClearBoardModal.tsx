/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from "@chakra-ui/react";

type ClearBoardProps = {
  onClick: () => void;
  onClose: () => void;
}

export function ClearBoardModal(props: ClearBoardProps) {
  return (
    <>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Clear the Board</ModalHeader>
        <ModalBody>Are you sure you want to DELETE all apps?</ModalBody>
        <ModalFooter>
          <Button colorScheme="teal" size="md" variant="outline" mr={3} onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="red"
            size="md"
            onClick={props.onClick}
          >
            Yes, Clear the Board
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  )
}