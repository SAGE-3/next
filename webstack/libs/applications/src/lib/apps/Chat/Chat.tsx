/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, Fragment } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

import { useAppStore, useHexColor, useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

/* App component for Chat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Colors for Dark theme and light theme
  const myColor = useHexColor('blue');
  const geppettoColor = useHexColor('purple');
  const otherUserColor = useHexColor('gray');
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.700', 'gray.100');

  const user = useUser();

  // Sort messages by creation date to display in order
  const sortedMessages = s.messages ? s.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  const chatBox = useRef<null | HTMLDivElement>(null);

  return (
    <AppWindow app={props}>
      {/* Display Messages */}
      <Box
        h="100%"
        w="100%"
        bg={bgColor}
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
        {sortedMessages.map((message, index) => {
          const isMe = user.user?._id == message.userId;
          const time = getDateString(message.creationDate);
          return (
            <Fragment key={index}>
              {/* Start of User Messages */}
              {message.query.length ? (
                <Box position="relative" my={10}>
                  <Box top="-30px" right={'15px'} position={'absolute'} textAlign="right">
                    <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="sm">
                      {message.userName}
                    </Text>
                    <Text whiteSpace={'nowrap'} textOverflow="ellipsis" color={textColor} fontSize="xs">
                      {time}
                    </Text>
                  </Box>

                  <Box display={'flex'} justifyContent="right">
                    <Box
                      color="white"
                      rounded={'md'}
                      boxShadow="md"
                      textAlign={'right'}
                      bg={isMe ? myColor : otherUserColor}
                      p={2}
                      m={3}
                      fontFamily="arial"
                      maxWidth="70%"
                    >
                      {message.query}
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {/* Start of Geppetto Messages */}
              <Box position="relative" my={10} maxWidth={'70%'}>
                <Box top="-30px" left={'15px'} position={'absolute'} textAlign="left">
                  <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="sm">
                    Geppetto
                  </Text>
                  <Text whiteSpace={'nowrap'} textOverflow="ellipsis" color={textColor} fontSize="xs">
                    {time}
                  </Text>
                </Box>

                <Box display={'flex'} justifyContent="left">
                  <Box boxShadow="md" color="white" rounded={'md'} textAlign={'left'} bg={geppettoColor} p={2} m={3} fontFamily="arial">
                    {message.response}
                  </Box>
                </Box>
              </Box>
            </Fragment>
          );
        })}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Chat */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
    </>
  );
}



function getDateString(epoch: number): string {
  const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}


export default { AppComponent, ToolbarComponent };
