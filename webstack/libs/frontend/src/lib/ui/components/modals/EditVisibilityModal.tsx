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
  Tooltip,
  Icon,
} from '@chakra-ui/react';

import { useUserSettings } from '../../../providers';
import { MdInfo } from 'react-icons/md';

interface EditPresenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The modal for editing the visibility settings of the user interface
 * @param props Disclousre for the visibility settings modal
 * @returns
 */
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
              <InfoTooltip label={'The cursors of other users.'} />
            </FormLabel>

            <Switch id="other-cursors" colorScheme="teal" isChecked={showCursors} onChange={toggleShowCursors} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-viewports" mb="0">
              Viewports
              <InfoTooltip label={'The rectangular outlines of clients sharing their viewport location.'} />
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showViewports} onChange={toggleShowViewports} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-app-titles" mb="0">
              Application Titles
              <InfoTooltip label={'The text title above each application window.'} />
            </FormLabel>

            <Switch id="other-cursors" colorScheme="teal" isChecked={showAppTitles} onChange={toggleShowAppTitles} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-interface" mb="0">
              User Interface
              <InfoTooltip label={'The SAGE3 interface of menus and buttons.'} />
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

// Info Icon with tooltips
function InfoTooltip(props: { label: string }): JSX.Element {
  return (
    <Tooltip label={props.label} placement="top" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
      <Icon transform={`translate(4px, 2px)`} as={MdInfo}></Icon>
    </Tooltip>
  );
}
