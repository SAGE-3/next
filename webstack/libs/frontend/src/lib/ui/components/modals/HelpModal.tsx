/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Modal, Button, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@chakra-ui/react';

import imageHelp from './sage3-help.png';

type HelpProps = {
  onClose: () => void;
  isOpen: boolean;
};

export function HelpModal(props: HelpProps) {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>SAGE3 Help</ModalHeader>
        <ModalBody>
          <img src={imageHelp} alt="SAGE3 Help" />
          {/* <iframe height="800px" width="100%" src={url} title="SAGE3 Help PDF"></iframe> */}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
