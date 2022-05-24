/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect } from 'react';

// Chakra imports
import { MenuProps, Modal, ModalContent, ModalHeader, ModalOverlay } from '@chakra-ui/react';

export interface S3ModalProps extends MenuProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  size?: string;
  initialRef?: React.RefObject<HTMLInputElement>;
}

/**
 * Menu Button for Applications, Assets, and Opened Applications buttons
 * Used to customize look of buttons on Menu bar component
 * @param SSearchModalProps
 * @returns
 */
export function S3Modal(props: S3ModalProps): JSX.Element {
  return (
    <Modal
      initialFocusRef={props.initialRef}
      closeOnEsc={true}
      closeOnOverlayClick={true}
      isOpen={props.isOpen}
      onClose={props.onClose}
      size={props.size}
      isCentered
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{props.title}</ModalHeader>
        {props.children}
      </ModalContent>
    </Modal>
  );
}

S3Modal.defaultProps = {
  size: '3xl',
};
