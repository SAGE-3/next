/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';
import {
  Button, Box, useColorModeValue, Tooltip, useDisclosure,
  Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader,
  Badge, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Spacer,
  VStack,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Flex,
  HStack,
  List,
  ListItem,
  UnorderedList,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import { MdKeyboardArrowUp } from 'react-icons/md';
import { HiSparkles } from "react-icons/hi2";

import { useHexColor, useUserSettings, useConfigStore } from '@sage3/frontend';
import { AIChat } from './AIChat';
import { set } from 'date-fns';

type SIProps = {
  notificationCount: number;
  isBoard?: boolean;
};

// SAP Intelligence Panel
export function IntelligencePane(props: SIProps) {
  const isBoard = props.isBoard ? props.isBoard : false;
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Colors
  const purpleColorMode = useColorModeValue('purple.400', 'purple.400');
  const purple = useHexColor(purpleColorMode);

  // Intelligence modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [sliderValue1, setSliderValue1] = useState(4);
  const [sliderValue2, setSliderValue2] = useState(3);
  const [location, setLocation] = useState('');
  const [selectedModel, setSelectedModel] = useState('chat');

  const openOrClose = () => {
    if (isOpen) {
      onClose();
    } else {
      onOpen();
    }
  };

  const setAIModel = (val: string) => {
    console.log('AI Model> ', val);
    setSelectedModel(val);
    localStorage.setItem('s3_ai_model', val);
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(function (location) {
      console.log('LatLong> ', location);
      setLocation(location.coords.latitude + ',' + location.coords.longitude);
    });

    // Look for a previously set model
    const local = localStorage.getItem('s3_ai_model');
    if (local) {
      // If value previously set, use it
      setSelectedModel(local);
    } else {
      // Otherwise, use openai if available, else chat
      setSelectedModel(config.openai.apiKey ? 'openai' : 'chat');
    }
  }, []);

  return (
    <Box borderRadius="md" display="flex">
      <Drawer placement="right" variant="code" isOpen={isOpen} onClose={onClose}>
        <DrawerContent maxWidth={"50vw"} height={"532px"}
          transitionDuration={"0.2s"}
          rounded={"lg"} position="absolute" style={{ top: undefined, bottom: "45px", right: "10px" }}>
          <DrawerHeader p={1} m={1}>
            SAGE Intelligence
          </DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody p={1} m={1} boxSizing="border-box">
            <Tabs style={{ width: '100%', height: '100%' }}>
              <TabList>
                <Tab>Chat</Tab>
                <Tab>Notifications
                  {props.notificationCount > 0 && (
                    <Badge colorScheme="green" variant="solid" pos="relative" right={-1} top={-2} >
                      {props.notificationCount}
                    </Badge>
                  )}
                </Tab>
                <Tab>Settings</Tab>
                <Tab>Debug</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <AIChat />
                </TabPanel>
                <TabPanel>
                  <p>No notifcations</p>
                </TabPanel>

                <TabPanel>
                  <VStack>
                    <VStack p={1} pt={1} w="100%" align={"left"}>
                      <Text fontSize="lg" mb={1} fontWeight={"bold"}>AI Models</Text>
                      <RadioGroup defaultValue={selectedModel} onChange={setAIModel}>
                        <Stack>
                          <Radio value='chat' isDisabled={!config.chat.url}><b>Chat</b>: {config.chat.model} - {config.chat.url.substring(0, 12) + '•'.repeat(10)}</Radio>
                          <Radio value='openai' isDisabled={!config.openai.apiKey}><b>OpenAI</b>: {config.openai.model} - {config.openai.apiKey ? config.openai.apiKey.substring(0, 3) + '•'.repeat(10) : 'n/a'}
                          </Radio>
                        </Stack>
                      </RadioGroup>
                    </VStack>

                    <VStack p={1} pt={1} w="100%" align={"left"}>
                      <Text fontSize="lg" mb={1} fontWeight={"bold"}>Expertise <small>(Not Yet Implemented)</small></Text>
                      <Flex>
                        <Text fontSize="md">Novice</Text>
                        <Spacer />
                        <Text fontSize="md" >Authority</Text>
                      </Flex>
                      <Slider aria-label='slider1' min={1} max={5} step={1} defaultValue={sliderValue1}
                        onChange={(val) => setSliderValue1(val)}>

                        <SliderMark value={1} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={2} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={3} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={4} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={5} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </VStack>

                    <VStack p={1} pt={6} w="100%" align={"left"}>
                      <Text fontSize="lg" mb={1} fontWeight={"bold"}>Granularity <small>(Not Yet Implemented)</small></Text>
                      <Flex>
                        <Text fontSize="md">Snapshot</Text>
                        <Spacer />
                        <Text fontSize="md" >Comprehensive</Text>
                      </Flex>
                      <Slider aria-label='slider2' min={1} max={5} step={1} defaultValue={sliderValue2}
                        onChange={(val) => setSliderValue2(val)}>

                        <SliderMark value={1} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={2} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={3} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={4} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>
                        <SliderMark value={5} mt='2' ml='-2' fontSize='sm'>
                          <MdKeyboardArrowUp />
                        </SliderMark>

                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </VStack>
                  </VStack>
                </TabPanel>

                <TabPanel>
                  {/* Debug panel */}
                  <VStack p={1} pt={1} w="100%" align={"left"}>
                    <Text fontSize="lg" mb={1} fontWeight={"bold"}>Location</Text>
                    <HStack>
                      <Button colorScheme="purple" size="sm" w="130px" variant={"solid"}
                        onClick={() => {
                          navigator.geolocation.getCurrentPosition(function (location) {
                            setLocation(location.coords.latitude + ',' + location.coords.longitude);
                          }, function (e) { console.log('Location> error', e); });
                        }}> Get Location </Button>
                      <Spacer />
                      <Text fontSize="md" mt={1} >Lat-Lng: {location}</Text>
                    </HStack>
                  </VStack>
                </TabPanel>

              </TabPanels>
            </Tabs>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {isBoard && showUI &&
        <Tooltip label={'Intelligence Panel'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <Button
            aria-label='SAGE Intelligence'
            as={Button}
            size="sm"
            colorScheme='purple'
            variant='solid'
            leftIcon={<HiSparkles fontSize="18px" />}
            width="100%"
            _hover={{ cursor: 'pointer', opacity: 1, backgroundColor: purple }}
            onClick={openOrClose}
          >
            SAGE Intelligence
            {props.notificationCount > 0 &&
              <Badge colorScheme="green" variant="solid"
                pos="relative" m={"3px"}>
                {props.notificationCount}
              </Badge>}
          </Button>
        </Tooltip>
      }
    </Box >
  );
}