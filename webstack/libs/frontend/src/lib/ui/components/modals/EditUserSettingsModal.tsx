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
  useColorMode,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  FormHelperText,
  useToast,
} from '@chakra-ui/react';
import { MdInfo, MdVisibility, MdVisibilityOff } from 'react-icons/md';

// SAGE Imports
import { LLMConfiguration, LLMConfigManager, TaskType, TASK_TYPES } from '@sage3/shared/types';
import { useUserSettings, useUser } from '../../../providers';
import { useConfigStore } from '../../../stores';
import {
  isElectron,
  getUserLLM,
  setUserLLM,
  clearUserLLM,
  maskApiKey,
  fetchAvailableModels,
  withUserProvider,
  USER_PROVIDER_NAME,
  USER_MODEL_CAPABILITIES,
} from '../../../utils';

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

  // Chakra Toggle Color Mode
  const { colorMode } = useColorMode();

  // User Settings Provider
  const {
    settings: userSettings,
    toggleShowCursors,
    toggleShowViewports,
    toggleShowAppTitles,
    toggleShowUI,
    toggleShowGrid,
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
  const showGrid = userSettings.showGrid;
  const showTags = userSettings.showTags;
  const showLinks = userSettings.showLinks;
  const uiScale = userSettings.uiScale;

  // SAGE Intelligence Settings
  const config = useConfigStore((state) => state.config);
  const [models, setModels] = useState<LLMConfiguration>();
  const [selectedModel, setSelectedModel] = useState(userSettings.aiModel);
  const [manager, setManager] = useState<LLMConfigManager>();

  // The user's own OpenAI-compatible credentials, held in this browser only.
  // Guests and spectators may not supply one: they are transient, unverified
  // accounts, and a key pasted into a shared guest session would outlive the
  // person who pasted it. They keep using the hub's configured providers.
  const { user } = useUser();
  const userRole = user?.data.userRole;
  const canUseOwnKey = userRole !== 'guest' && userRole !== 'spectator';
  const toast = useToast();
  const [userKey, setUserKey] = useState('');
  const [userBaseUrl, setUserBaseUrl] = useState('');
  const [userModelId, setUserModelId] = useState('');
  const [showKey, setShowKey] = useState(false);
  // The credentials as last saved, so the form can show what is stored
  const [savedUserLLM, setSavedUserLLM] = useState(() => getUserLLM());
  // Models offered by the endpoint, looked up whenever the key or URL changes
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');

  // Load the stored credentials into the form each time the modal opens
  useEffect(() => {
    if (!props.isOpen) return;
    if (!canUseOwnKey) {
      // A key left behind by a previous account in this browser must not be
      // usable by a guest: drop it rather than merely hiding the form
      clearUserLLM();
      setSavedUserLLM(undefined);
      return;
    }
    const stored = getUserLLM();
    setSavedUserLLM(stored);
    setUserBaseUrl(stored?.baseUrl ?? '');
    setUserModelId(stored?.modelId ?? '');
    // The key itself is never put back on screen — only its masked form is shown
    setUserKey('');
    setShowKey(false);
  }, [props.isOpen, canUseOwnKey]);

  // Look up the endpoint's models whenever the key or the base URL changes.
  // Typing is debounced so a request is not made per keystroke, and any lookup
  // already in flight is aborted the moment either value changes again.
  useEffect(() => {
    if (!props.isOpen || !canUseOwnKey) return;
    // An untouched key field means "keep the saved key", so look that one up
    const key = userKey.trim() || savedUserLLM?.apiKey || '';
    if (!key) {
      setAvailableModels([]);
      setModelsError('');
      setModelsLoading(false);
      return;
    }

    const controller = new AbortController();
    setModelsLoading(true);
    setModelsError('');

    const timer = setTimeout(() => {
      fetchAvailableModels(key, userBaseUrl, controller.signal)
        .then((ids) => {
          setAvailableModels(ids);
          setModelsLoading(false);
        })
        .catch((e: unknown) => {
          // A cancelled lookup is not a failure: a newer one has replaced it
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setAvailableModels([]);
          // Drop the model too: it belonged to an endpoint we could not reach,
          // so leaving it in place would suggest a choice that was confirmed
          setUserModelId('');
          setModelsError(e instanceof Error ? e.message : 'Lookup failed');
          setModelsLoading(false);
        });
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [userKey, userBaseUrl, canUseOwnKey, props.isOpen, savedUserLLM]);

  const handleSaveUserLLM = () => {
    if (!canUseOwnKey) return;
    const key = userKey.trim();
    const modelId = userModelId.trim();
    // Re-saving without retyping the key keeps the stored one
    const effectiveKey = key || savedUserLLM?.apiKey || '';
    if (!effectiveKey) {
      toast({ title: 'Enter an API key', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    if (!modelId) {
      toast({
        title: availableModels.length > 0 ? 'Select a model' : 'Enter a model name',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    try {
      setUserLLM({ apiKey: effectiveKey, baseUrl: userBaseUrl, modelId });
      setSavedUserLLM(getUserLLM());
      setUserKey('');
      setShowKey(false);
      // Configuring it is the act of choosing it: select it rather than
      // leaving the user to click the radio that was disabled until now
      setSelectedModel(USER_PROVIDER_NAME);
      setAIModel(USER_PROVIDER_NAME);
      toast({ title: 'Key saved — now using your own key', status: 'success', duration: 3000, isClosable: true });
    } catch (e) {
      toast({ title: 'Could not save the key', status: 'error', duration: 4000, isClosable: true });
    }
  };

  const handleClearUserLLM = () => {
    clearUserLLM();
    setSavedUserLLM(undefined);
    setUserKey('');
    setUserBaseUrl('');
    setUserModelId('');
    setAvailableModels([]);
    setModelsError('');
    setModelsLoading(false);
    setShowKey(false);
    // Fall back to a server provider if this one was selected
    if (selectedModel === USER_PROVIDER_NAME) {
      const fallback = Object.keys(models?.providers || {})[0] || '';
      setSelectedModel(fallback);
      setAIModel(fallback);
    }
    toast({ title: 'Key removed from this browser', status: 'info', duration: 3000, isClosable: true });
  };

  useEffect(() => {
    if (config) {
      setModels(config.models);
      // Include the user's own provider so its tasks are computed the same way
      setManager(new LLMConfigManager(withUserProvider(config.models)));
    }
  }, [config, savedUserLLM]);

  useEffect(() => {
    // Wait for the provider list to load before validating the saved model
    if (!models) return;
    // The user's own key is not a server provider, so validate it separately:
    // it stays selected as long as credentials are stored in this browser
    if (userSettings.aiModel === USER_PROVIDER_NAME) {
      if (savedUserLLM) {
        setSelectedModel(USER_PROVIDER_NAME);
        return;
      }
      // Credentials were cleared elsewhere: fall through to a server provider
    }
    const providerKeys = Object.keys(models.providers || {});
    if (userSettings.aiModel && providerKeys.includes(userSettings.aiModel)) {
      // Saved provider still exists in the config: keep it
      setSelectedModel(userSettings.aiModel);
    } else if (providerKeys.length > 0) {
      // Saved provider is missing or invalid (e.g. a legacy 'llama' value in
      // localStorage): fall back to the first available provider and persist it
      const val = providerKeys[0];
      setSelectedModel(val);
      setAIModel(val);
    }
  }, [userSettings.aiModel, models, savedUserLLM]);

  return (
    <Modal
      isCentered
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      returnFocusOnClose={false}
      initialFocusRef={initialRef}
      size="xl"
    >
      <ModalOverlay />
      <ModalContent height={'650px'}>
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

                <FormControl display="flex" my="2" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="hide-grid" mb="0">
                    Background Grid
                    <InfoTooltip label={'Show/Hide the background grid. Must enable User Interface.'} />
                  </FormLabel>
                  <Switch id="hide-grid" colorScheme="teal" isChecked={showGrid} onChange={toggleShowGrid} isDisabled={!showUI} />
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
                <VStack p={1} pt={1} w="100%" align={'left'}>
                  <Text fontSize="lg" mb={1} fontWeight={'bold'}>
                    AI Providers and Models
                  </Text>
                  {/* Controlled, so removing the key can move the selection off it */}
                  <RadioGroup
                    value={selectedModel}
                    onChange={(val) => {
                      setSelectedModel(val);
                      setAIModel(val);
                    }}
                    colorScheme="purple"
                  >
                    <Stack maxHeight="400px" overflowY="auto">
                      {models?.providers &&
                        Object.entries(models.providers).map(([provider, providerData]) => {
                          const availableTasks = manager
                            ? TASK_TYPES.filter((task) => {
                                const cando = manager.canProviderPerformTask(provider, task);
                                return cando;
                              })
                            : [];

                          return (
                            <VStack key={provider} align="start" spacing={1} p={1} borderWidth="1px" borderRadius="md" w="100%">
                              <Radio value={provider}>
                                <Text fontWeight="bold">{provider}</Text>
                              </Radio>
                              {availableTasks.length > 0 && (
                                <Text pl={6} fontSize="sm" color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                                  Tasks enabled: {availableTasks.join(', ')}
                                </Text>
                              )}

                              {providerData.models && (
                                <VStack align="start" pl={8} spacing={1}>
                                  {Object.entries(providerData.models).map(([modelName, modelData]) => (
                                    <VStack key={modelName} align="start" spacing={0}>
                                      <HStack>
                                        {' '}
                                        <Text fontSize="sm" fontWeight="semibold">
                                          - {modelName}
                                        </Text>
                                        <Text fontSize="sm">({modelData.model_id})</Text>
                                      </HStack>
                                      {modelData.capabilities && (
                                        <Text fontSize="sm" pl={2} color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                                          capabilities:{' '}
                                          {Array.isArray(modelData.capabilities)
                                            ? modelData.capabilities.join(', ')
                                            : String(modelData.capabilities)}
                                        </Text>
                                      )}
                                    </VStack>
                                  ))}
                                </VStack>
                              )}
                            </VStack>
                          );
                        })}

                      {/* The user's own key: a provider in the list, with its
                          form inline so it can be configured where it is chosen */}
                      <VStack align="start" spacing={1} p={1} borderWidth="1px" borderRadius="md" w="100%">
                        <Radio value={USER_PROVIDER_NAME} isDisabled={!canUseOwnKey || !savedUserLLM}>
                          <Text fontWeight="bold">your own model</Text>
                        </Radio>
                        {savedUserLLM && manager && (
                          <Text pl={6} fontSize="sm" color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                            Tasks enabled:{' '}
                            {TASK_TYPES.filter((task) => manager.canProviderPerformTask(USER_PROVIDER_NAME, task)).join(', ')}
                          </Text>
                        )}

                        {!canUseOwnKey ? (
                          <Text pl={6} fontSize="sm" color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                            Guest accounts cannot add their own API key. Sign in with a full account to use one.
                          </Text>
                        ) : (
                          <VStack align="start" spacing={2} pl={6} w="100%">
                            <Text fontSize="sm" color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                              An OpenAI-compatible service billed to you. The key stays in this browser and is never stored on the SAGE3
                              server.
                            </Text>

                            {savedUserLLM && (
                              <VStack align="start" spacing={0}>
                                <HStack>
                                  <Text fontSize="sm" fontWeight="semibold">
                                    - {savedUserLLM.modelId}
                                  </Text>
                                  <Text fontSize="sm">({maskApiKey(savedUserLLM.apiKey)})</Text>
                                </HStack>
                                <Text fontSize="sm" pl={2} color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                                  capabilities: {USER_MODEL_CAPABILITIES.join(', ')}
                                </Text>
                              </VStack>
                            )}

                            <FormControl>
                              <FormLabel fontSize="sm" mb={1}>
                                API key
                              </FormLabel>
                              <InputGroup size="sm">
                                <Input
                                  type={showKey ? 'text' : 'password'}
                                  value={userKey}
                                  onChange={(e) => setUserKey(e.target.value)}
                                  placeholder={savedUserLLM ? 'Saved — leave blank to keep it' : 'sk-...'}
                                  _placeholder={{ opacity: 1, color: 'gray.400' }}
                                  autoComplete="off"
                                  borderRadius="md"
                                />
                                <InputRightElement>
                                  <IconButton
                                    aria-label={showKey ? 'Hide key' : 'Show key'}
                                    icon={showKey ? <MdVisibilityOff /> : <MdVisibility />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => setShowKey(!showKey)}
                                  />
                                </InputRightElement>
                              </InputGroup>
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" mb={1}>
                                Base URL (optional)
                              </FormLabel>
                              <Input
                                size="sm"
                                value={userBaseUrl}
                                onChange={(e) => setUserBaseUrl(e.target.value)}
                                placeholder="https://api.openai.com/v1"
                                autoComplete="off"
                                borderRadius="md"
                              />
                              <FormHelperText fontSize="xs">Leave blank for OpenAI.</FormHelperText>
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" mb={1}>
                                Model
                              </FormLabel>
                              {availableModels.length > 0 ? (
                                <Select
                                  size="sm"
                                  value={userModelId}
                                  onChange={(e) => setUserModelId(e.target.value)}
                                  placeholder="Select a model"
                                  borderRadius="md"
                                >
                                  {availableModels.map((id) => (
                                    <option key={id} value={id}>
                                      {id}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                /* No list to choose from: let the model be typed
                                   so endpoints without /models still work */
                                <Input
                                  size="sm"
                                  value={userModelId}
                                  onChange={(e) => setUserModelId(e.target.value)}
                                  placeholder="gpt-4o"
                                  autoComplete="off"
                                  borderRadius="md"
                                />
                              )}
                              <FormHelperText fontSize="xs">
                                {modelsLoading
                                  ? 'Checking the endpoint for available models…'
                                  : modelsError
                                    ? `${modelsError}. Type the model name instead.`
                                    : availableModels.length > 0
                                      ? `${availableModels.length} models at this endpoint. Assumed to handle chat, code, and vision.`
                                      : 'Assumed to handle chat, code, and vision. Image generation is not available.'}
                              </FormHelperText>
                            </FormControl>

                            <HStack spacing={2} pb={1}>
                              <Button size="sm" colorScheme="purple" onClick={handleSaveUserLLM}>
                                {savedUserLLM ? 'Update' : 'Save'}
                              </Button>
                              <Button size="sm" colorScheme="red" variant="outline" onClick={handleClearUserLLM} isDisabled={!savedUserLLM}>
                                Remove
                              </Button>
                            </HStack>
                          </VStack>
                        )}
                      </VStack>
                    </Stack>
                  </RadioGroup>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter display="flex" justifyContent={'space-between'}>
          <Button colorScheme="teal" size="sm" onClick={restoreDefaultSettings}>
            Restore Default Settings
          </Button>
          <Button colorScheme="green" size="sm" width="80px" onClick={props.onClose} ref={initialRef}>
            OK
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
