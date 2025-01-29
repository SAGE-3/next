/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';
import {
  Button, Box,
  Badge, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Spacer,
  VStack,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Flex,
  HStack,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import { MdKeyboardArrowUp } from 'react-icons/md';

import { useUserSettings, useConfigStore } from '@sage3/frontend';
import { ServerConfiguration } from '@sage3/shared/types';

type IntelligenceProps = {
  notificationCount: number;
};

// Intelligence Panel
export function IntelligenceMenu(props: IntelligenceProps) {
  const { settings, setAIModel } = useUserSettings();
  // Configuration information
  const config = useConfigStore((state) => state.config);
  const [llama, setLlama] = useState<ServerConfiguration['services']['llama']>();
  const [openai, setOpenai] = useState<ServerConfiguration['services']['openai']>();

  const [sliderValue1, setSliderValue1] = useState(4);
  const [sliderValue2, setSliderValue2] = useState(3);
  const [location, setLocation] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings.aiModel);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(function (location) {
      setLocation(location.coords.latitude + ',' + location.coords.longitude);
    });
  }, []);

  useEffect(() => {
    if (config) {
      setLlama(config.llama);
      setOpenai(config.openai);
    }
  }, [config]);

  useEffect(() => {
    // Look for a previously set model
    if (settings.aiModel) {
      // If value previously set, use it
      setSelectedModel(settings.aiModel);
    } else {
      // Otherwise, use openai if available, else llama
      const val = openai?.apiKey ? 'openai' : 'llama';
      setSelectedModel(val);
      setAIModel(val);
    }
  }, [settings.aiModel, openai]);

  return (
    <Box display="flex" flexDirection="column" minWidth={"450px"} maxWidth={"40vw"} height={"200px"}>
      <Tabs style={{ width: '100%', height: '100%' }}>

        <TabList>
          <Tab>Settings</Tab>
          <Tab>Notifications
            {props.notificationCount > 0 && (
              <Badge colorScheme="green" variant="solid" pos="relative" right={-1} top={-2}>
                {props.notificationCount}
              </Badge>
            )}
          </Tab>
          <Tab>Debug</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack>
              <VStack p={1} pt={1} w="100%" align={"left"}>
                <Text fontSize="lg" mb={1} fontWeight={"bold"}>Models</Text>
                <RadioGroup defaultValue={selectedModel} onChange={setAIModel} colorScheme='purple'>
                  <Stack>
                    <Radio value='llama' isDisabled={!llama?.url}><b>Llama</b>: {llama?.model} - {llama?.url.substring(0, 12) + '•'.repeat(10)}</Radio>
                    <Radio value='openai' isDisabled={!openai?.apiKey}><b>OpenAI</b>: {openai?.model} - {openai?.apiKey ? openai?.apiKey.substring(0, 3) + '•'.repeat(10) : 'n/a'}
                    </Radio>
                  </Stack>
                </RadioGroup>
              </VStack>

              <VStack p={1} pt={2} w="100%" align={"left"} hidden={true}>
                <Text fontSize="lg" mb={1} fontWeight={"bold"}>Expertise level</Text>
                <Flex>
                  <Text fontSize="md">Novice</Text>
                  <Spacer />
                  <Text fontSize="md">Authority</Text>
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

              <VStack p={1} pt={6} w="100%" align={"left"} hidden={true}>
                <Text fontSize="lg" mb={1} fontWeight={"bold"}>Answer details</Text>
                <Flex>
                  <Text fontSize="md">Snapshot</Text>
                  <Spacer />
                  <Text fontSize="md">Comprehensive</Text>
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
            <p>No notifcations</p>
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
                  }}> Update </Button>
                <Spacer />
                <Text fontSize="md" mt={1}>Lat-Lng: {location}</Text>
              </HStack>
            </VStack>
          </TabPanel>

        </TabPanels>
      </Tabs>

    </Box >
  );
}

/*
Drawer structure:

    <Drawer placement="right" variant="code" isOpen={isOpen} onClose={onClose} closeOnEsc={true} closeOnOverlayClick={true}>
      <DrawerContent maxWidth={"40vw"} height={"532px"}
        rounded={"lg"} position="absolute" style={{ top: undefined, bottom: "45px", right: "10px" }}
        motionProps={{
          variants: {
            enter: { x: "0%", transition: { duration: 0.1 }, },
            exit: { x: "100%", transition: { duration: 0.1 }, },
          },
        }}>
        <DrawerHeader p={1} m={1}>
          XXXX
        </DrawerHeader>

        <DrawerCloseButton />

        <DrawerBody p={1} m={1} boxSizing="border-box">
          <Tabs style={{ width: '100%', height: '100%' }}>

          </Tabs>
        </DrawerBody>

        </DrawerContent>

        </Drawer>
*/
