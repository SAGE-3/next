/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  FormLabel,
  FormControl,
  Switch,
  Text,
  Icon,
} from '@chakra-ui/react';

import { useUser } from '../../../providers';
import { MdSquare } from 'react-icons/md';

interface EditPresenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditPresenceSettingsModal(props: EditPresenceSettingsModalProps): JSX.Element {
  const { user, update } = useUser();

  console.log('user', user);

  const showCursor = user && user.data.settings ? user.data.settings.showCursor : false;

  // Handle change of switch
  const handleShowCursorChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    // Get current value
    const value = ev.target.checked;
    if (update && user) {
      update({ settings: { ...user.data.settings, showCursor: value } });
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} size="xs">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl" pb="0">
          Presence Settings
        </ModalHeader>
        <ModalBody>
          <Text fontSize="2xl" my="0">
            Your Settings
          </Text>
          <FormControl display="flex" my="1" pr="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="show-your-cursor" mb="0" pl="4">
              Cursor
            </FormLabel>
            <Switch id="your-cursor" colorScheme="teal" isChecked={showCursor} onChange={handleShowCursorChange} />
          </FormControl>
          <FormControl display="flex" my="1" pr="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="show-your-cursor" mb="0" pl="4">
              Viewport
            </FormLabel>
            <Switch id="your-viewport" colorScheme="teal" isChecked={showCursor} onChange={handleShowCursorChange} />
          </FormControl>
          <Text fontSize="2xl" mb="0" mt="6">
            Other Users Settings
          </Text>
          <FormControl display="flex" my="1" pr="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="show-your-cursor" mb="0" pl="4">
              Cursor
            </FormLabel>
            <Switch id="other-cursors" colorScheme="teal" isChecked={showCursor} onChange={handleShowCursorChange} />
          </FormControl>
          <FormControl display="flex" my="1" pr="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="show-your-cursor" mb="0" pl="4">
              Viewport
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showCursor} onChange={handleShowCursorChange} />
          </FormControl>
        </ModalBody>
        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
