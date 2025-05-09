/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React and Chakra UI Imports
import { useEffect, useRef, useState } from 'react';
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
  Radio,
  RadioGroup,
  Stack,
  VStack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { MdInfo } from 'react-icons/md';

// SAGE Imports
import { ServerConfiguration } from '@sage3/shared/types';
import { useUserSettings } from '../../../providers';
import { useConfigStore } from '../../../stores';
import { isElectron } from '../../../utils';

interface EditUserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab?: UserSettingsTabs;
}

type UserSettingsTabs = 'interface' | 'board' | 'intelligence';
const tabDict: Record<UserSettingsTabs, number> = {
  interface: 0,
  board: 1,
  intelligence: 2,
};

/**
 * The modal for editing the user settings.
 * @param props Disclousre for the settings modal
 * @returns
 */
export function EditUserSettingsModal(props: EditUserSettingsModalProps): JSX.Element {
  const initialRef = useRef(null);
  const tabIndex = props.tab ? tabDict[props.tab] : 0;

  // User Settings Provider
  const {
    settings: userSettings,
    toggleShowCursors,
    toggleShowViewports,
    toggleShowAppTitles,
    toggleShowUI,
    setShowLinks,
    toggleShowTags,
    setAIModel,
    setUIScale,
    restoreDefaultSettings,
  } = useUserSettings();

  const showCursors = userSettings.showCursors;
  const showViewports = userSettings.showViewports;
  const showAppTitles = userSettings.showAppTitles;
  const showUI = userSettings.showUI;
  const showTags = userSettings.showTags;
  const showLinks = userSettings.showLinks;
  const uiScale = userSettings.uiScale;

  // SAGE Intelligence Settings
  const config = useConfigStore((state) => state.config);
  const [llama, setLlama] = useState<ServerConfiguration['services']['llama']>();
  const [openai, setOpenai] = useState<ServerConfiguration['services']['openai']>();
  const [azure, setAzure] = useState<ServerConfiguration['services']['azure']>();
  const [selectedModel, setSelectedModel] = useState(userSettings.aiModel);

  useEffect(() => {
    if (config) {
      setLlama(config.llama);
      setOpenai(config.openai);
      setAzure(config.azure);
    }
  }, [config]);

  useEffect(() => {
    // Look for a previously set model
    if (userSettings.aiModel) {
      // If value previously set, use it
      setSelectedModel(userSettings.aiModel);
    } else {
      // Otherwise, use azure as default
      const val = 'azure';
      setSelectedModel(val);
      setAIModel(val);
    }
  }, [userSettings.aiModel, openai, setAIModel]);

  return (
    <Modal
      isCentered
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      returnFocusOnClose={false}
      initialFocusRef={initialRef}
      size="lg"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl" pb="0">
          User Settings
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody mb="1" minHeight="300px">
          <Tabs defaultIndex={tabIndex}>
            <TabList>
              <Tab>Interface</Tab>
              <Tab>Board Visibility</Tab>
              <Tab>Intelligence</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                {/* Dropdown for selecting UI Scale */}
                {isElectron() && (
                  <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="ui-scale" mb="0">
                      User Interface Size
                      <InfoTooltip label={'Adjust the size of the user interface.'} />
                    </FormLabel>
                    <Select
                      id="ui-scale"
                      colorScheme="teal"
                      size="sm"
                      isDisabled={!showUI}
                      width="120px"
                      textAlign={'right'}
                      value={uiScale}
                      onChange={(e) => setUIScale(e.target.value as 'xs' | 's' | 'md' | 'lg' | 'xl')}
                    >
                      <option value="xs">Extra Small</option>
                      <option value="s">Small</option>
                      <option value="md">Default</option>
                      <option value="lg">Large</option>
                      <option value="xl">Extra Large</option>
                    </Select>
                  </FormControl>
                )}
                <FormControl display="flex" mt="2" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="hide-interface" mb="0">
                    Show User Interface
                    <InfoTooltip label={'Show/Hide SAGE3 menus and buttons.'} />
                  </FormLabel>
                  <Switch id="other-viewports" colorScheme="teal" isChecked={showUI} onChange={toggleShowUI} />
                </FormControl>
              </TabPanel>
              <TabPanel>
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
                  <FormLabel htmlFor="hide-tags" mb="0">
                    Tags
                    <InfoTooltip label={'Show/Hide SAGE3 tags. Must enable User Interface.'} />
                  </FormLabel>
                  <Switch id="other-viewports" colorScheme="teal" isChecked={showTags} onChange={toggleShowTags} isDisabled={!showUI} />
                </FormControl>

                <FormControl display="flex" mt="2" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="hide-provenance" mb="0">
                    Links
                    <InfoTooltip label={'Show/Hide SAGE3 arrows for provenance. Must enable User Interface.'} />
                  </FormLabel>
                  <Select
                    id="other-viewports"
                    colorScheme="teal"
                    size="sm"
                    onChange={(e) => setShowLinks(e.target.value as 'none' | 'selected' | 'selected-path' | 'all')}
                    value={showLinks}
                    isDisabled={!showUI}
                    width="180px"
                    textAlign={'right'}
                  >
                    <option value="none">None</option>
                    <option value="selected">Selected App</option>
                    <option value="selected-path">Selected App's Path</option>
                    <option value="all">All Links</option>
                  </Select>
                </FormControl>
              </TabPanel>

              <TabPanel>
                <VStack>
                  <VStack p={1} pt={1} w="100%" align={'left'}>
                    <Text fontSize="lg" mb={1} fontWeight={'bold'}>
                      Models
                    </Text>
                    <RadioGroup defaultValue={selectedModel} onChange={setAIModel} colorScheme="purple">
                      <Stack>
                        <Radio value="llama" isDisabled={!llama?.url}>
                          <b>Llama</b>: {llama?.model} - {llama?.url.substring(0, 12) + '•'.repeat(10)}
                        </Radio>
                        <Radio value="openai" isDisabled={!openai?.apiKey}>
                          <b>OpenAI</b>: {openai?.model} - {openai?.apiKey ? openai?.apiKey.substring(0, 3) + '•'.repeat(10) : 'n/a'}
                        </Radio>
                        <Radio value="azure" isDisabled={!azure?.text.apiKey}>
                          <b>Azure</b>: {azure?.text.model} - {azure?.text.apiKey ? azure?.text.apiKey.substring(0, 3) + '•'.repeat(10) : 'n/a'}
                        </Radio>
                      </Stack>
                    </RadioGroup>
                  </VStack>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
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
