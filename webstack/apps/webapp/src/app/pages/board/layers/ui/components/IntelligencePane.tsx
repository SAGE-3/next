/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useState } from 'react';
import {
  Box, useColorModeValue, Tooltip, IconButton, useDisclosure,
  Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader,
  Badge, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Spacer,
  VStack,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  HStack,
  Flex,
} from '@chakra-ui/react';
import { MdKeyboardArrowUp } from 'react-icons/md';
import { HiSparkles } from "react-icons/hi2";


import { useHexColor, useUserSettings } from '@sage3/frontend';
import { AIChat } from './AIChat';

type SIProps = {
  notificationCount: number;
  isBoard?: boolean;
};

// SAP Intelligence Panel
export function IntelligencePane(props: SIProps) {
  const isBoard = props.isBoard ? props.isBoard : false;

  const { settings } = useUserSettings();
  const showUI = settings.showUI;

  // Colors
  const backgroundColor = useColorModeValue('#ffffff69', '#22222269');
  const tealColorMode = useColorModeValue('teal.500', 'teal.200');
  const teal = useHexColor(tealColorMode);

  // Intelligence modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [sliderValue1, setSliderValue1] = useState(4);
  const [sliderValue2, setSliderValue2] = useState(3);

  return (
    <Box
      borderRadius="md"
      backgroundColor={backgroundColor}
      whiteSpace={'nowrap'}
      width="100%"
      display="flex"
      pr={2}
      pl={1}
      justifyContent="right"
      alignItems={'center'}
    >
      <Drawer placement="right" variant="code" isOpen={isOpen} onClose={onClose}>
        <DrawerContent maxWidth={"50vw"} height={"520px"}
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
                      <Text fontSize="lg" mb={1} fontWeight={"bold"}>Expertise</Text>
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
                      <Text fontSize="lg" mb={1} fontWeight={"bold"}>Granularity</Text>
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

              </TabPanels>
            </Tabs>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {isBoard && showUI && (
        <Tooltip label={'SAGE Intelligence'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <Box p={0} m={0}>
            <IconButton
              borderRadius="md"
              h="auto"
              p={0}
              pb={'1px'}
              mr="-2"
              justifyContent="center"
              aria-label={'Controls'}
              icon={<HiSparkles size="32px" />}
              background={'transparent'}
              colorScheme="gray"
              transition={'all 0.2s'}
              opacity={0.75}
              variant="solid"
              onClick={onOpen}
              isDisabled={false}
              _hover={{ color: teal, opacity: 1, transform: 'scale(1.5)' }}
            />
            {props.notificationCount > 0 && (
              <Badge colorScheme="green" variant="solid"
                pos="relative" right={1} bottom={-2}>
                {props.notificationCount}
              </Badge>)}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}
