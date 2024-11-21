/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef } from 'react';
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
  Select,
  Tooltip,
  Icon,
  ModalCloseButton,
} from '@chakra-ui/react';
import { MdInfo } from 'react-icons/md';

import { useUserSettings } from '../../../providers';

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
    toggleProvenance,
    toggleShowTags,
    restoreDefaultSettings,
  } = useUserSettings();

  const showCursors = userSettings.showCursors;
  const showViewports = userSettings.showViewports;
  const showAppTitles = userSettings.showAppTitles;
  const showUI = userSettings.showUI;
  const showTags = userSettings.showTags;
  const showProvenance = userSettings.showProvenance;

  const initialRef = useRef(null);

  return (
    <Modal
      isCentered
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      returnFocusOnClose={false}
      initialFocusRef={initialRef}
      size="md"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl" pb="0">
          Visibility Settings
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody mb="1">
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-cursors" mb="0">
              Cursors
              <InfoTooltip label={'Show/Hide the cursors of other users.'} />
            </FormLabel>

            <Switch id="other-cursors" colorScheme="teal" isChecked={showCursors} onChange={toggleShowCursors} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-viewports" mb="0">
              Viewports
              <InfoTooltip label={'Show/Hide the outlines of clients sharing their viewport.'} />
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showViewports} onChange={toggleShowViewports} />
          </FormControl>
          <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-app-titles" mb="0">
              Application Titles
              <InfoTooltip label={'Show/Hide the title above each application window.'} />
            </FormLabel>

            <Switch id="other-cursors" colorScheme="teal" isChecked={showAppTitles} onChange={toggleShowAppTitles} />
          </FormControl>
          <FormControl display="flex" mt="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-interface" mb="0">
              User Interface
              <InfoTooltip label={'Show/Hide SAGE3 menus and buttons.'} />
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showUI} onChange={toggleShowUI} />
          </FormControl>
          <FormControl display="flex" mt="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-tags" mb="0">
              Tags
              <InfoTooltip label={'Show/Hide SAGE3 tags. Must enable User Interface.'} />
            </FormLabel>
            <Switch id="other-viewports" colorScheme="teal" isChecked={showTags} onChange={toggleShowTags} isDisabled={!showUI} />
          </FormControl>


          <FormControl display="flex" mt="2" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="hide-provenance" mb="0">
              Provenance
              <InfoTooltip label={'Show/Hide SAGE3 arrows for provenance. Must enable User Interface.'} />
            </FormLabel>
            <Select id="other-viewports" colorScheme="teal" size="sm"
              onChange={(e) => toggleProvenance(e.target.value as 'none' | 'selected' | 'all')}
              value={showProvenance} isDisabled={!showUI} width="180px" textAlign={'right'}>
              <option value="none">None</option>
              <option value="selected">Selected Application</option>
              <option value="all">All Applications</option>
            </Select>
          </FormControl>

        </ModalBody>
        <ModalFooter display="flex" justifyContent={'left'}>
          <Button colorScheme="teal" size="sm" width="100%" onClick={restoreDefaultSettings} ref={initialRef}>
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
    <Tooltip defaultIsOpen={false} label={props.label} placement="top" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
      <Icon transform={`translate(4px, 2px)`} as={MdInfo}></Icon>
    </Tooltip>
  );
}
