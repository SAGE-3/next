/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  FormLabel,
  FormControl,
  Switch,
  ModalFooter,
  Button,
} from '@chakra-ui/react';

import { useUserSettings } from '../../../providers';

interface EditPresenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditVisibilityModal(props: EditPresenceSettingsModalProps): JSX.Element {
  const {
    settings: userSettings,
    toggleShowCursors,
    toggleShowViewports,
    toggleShowAppTitles,
    toggleShowUI,
    restoreDefaultSettings,
  } = useUserSettings();

  const showCursors = userSettings.showCursors;
  const showViewports = userSettings.showViewports;
  const showAppTitles = userSettings.showAppTitles;
  const showUI = userSettings.showUI;

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} size="xs">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl" pb="0">
          Visibility Settings
        </ModalHeader>
        <ModalBody mb="2">
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-cursors" mb="0">
              Cursors
            </FormLabel>
            <Switch id="other-cursors" colorScheme="teal" isChecked={showCursors} onChange={toggleShowCursors} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-viewports" mb="0">
              Viewports
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showViewports} onChange={toggleShowViewports} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-app-titles" mb="0">
              App Titles
            </FormLabel>
            <Switch id="other-cursors" colorScheme="teal" isChecked={showAppTitles} onChange={toggleShowAppTitles} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-interface" mb="0">
              User Interface
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showUI} onChange={toggleShowUI} />
          </FormControl>
        </ModalBody>
        <ModalFooter display="flex" justifyContent={'left'}>
          <Button colorScheme="teal" size="sm" width="100%" onClick={restoreDefaultSettings}>
            Restore Default Settings
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
