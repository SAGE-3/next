/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';

import {
  Box, useColorModeValue, Tooltip, IconButton, useDisclosure,
  Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader,
  Badge, Tab, TabList, TabPanel, TabPanels, Tabs,
  Flex, Input, InputGroup, InputRightElement,
} from '@chakra-ui/react';
import { HiSparkles } from "react-icons/hi2";

import { MdSend } from 'react-icons/md';

import { useHexColor, useUserSettings, useUser } from '@sage3/frontend';

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
                  <p>one!</p>
                  <p>one!</p>
                  <p>one!</p>
                  <p>one!</p>
                </TabPanel>
                <TabPanel>
                  <p>Settings</p>
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


function AIChat() {
  const { roomId, boardId } = useParams();
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.500', 'gray.100');

  // Input text for query
  const [input, setInput] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBox = useRef<null | HTMLDivElement>(null);


  const newMessage = async (new_input: string) => {
    if (!user) return;
    if (!roomId) return;
    if (!boardId) return;

    console.log('New Message>', new_input);
  };

  const sendMessage = async () => {
    const text = input.trim();
    console.log('Send Message>', text);
    setInput('');
    await newMessage(text);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  useEffect(() => {
    async function fetchStatus() {
      const response = true;
      console.log('Agent Status>', response);
    }
    fetchStatus();

    if (inputRef.current) {
      inputRef.current.focus();
    }

  }, [inputRef]);


  return (
    <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="400px" w="100%">
      <Box
        flex={1}
        bg={bgColor}
        borderRadius={'md'}
        overflowY="scroll"
        ref={chatBox}
        css={{
          '&::-webkit-scrollbar': {
            width: '12px',
          },
          '&::-webkit-scrollbar-track': {
            '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: `${scrollColor}`,
            borderRadius: '6px',
            outline: `3px solid ${bgColor}`,
          },
        }}
      >
        <Box display={'flex'} justifyContent={'right'}>
          <Box
            color="white"
            rounded={'md'}
            boxShadow="md"
            fontFamily="arial"
            textAlign={'right'}
            bg={myColor}
            p={1}
            m={3}
            maxWidth="70%"
            userSelect={'none'}
          >
            Question...
          </Box>
        </Box>

        <Box display={'flex'} justifyContent={'left'}>
          <Box
            color="black"
            rounded={'md'}
            boxShadow="md"
            fontFamily="arial"
            textAlign={'left'}
            bg={textColor}
            p={1}
            m={3}
            maxWidth="70%"
            userSelect={'none'}
          >
            Answer...
          </Box>
        </Box>
      </Box>

      <InputGroup bg={'blackAlpha.100'}>
        <Input
          placeholder={"Query"}
          size="md"
          variant="outline"
          _placeholder={{ color: 'inherit' }}
          onChange={handleChange}
          onKeyDown={onSubmit}
          value={input}
          ref={inputRef}
        />
        <InputRightElement onClick={sendMessage}>
          <MdSend color="green.500" />
        </InputRightElement>
      </InputGroup>

    </Flex>
  );
}