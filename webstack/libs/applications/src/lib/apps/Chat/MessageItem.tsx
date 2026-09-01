/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Fragment } from 'react';
import { Box, Text, Tooltip, Center, Divider, AbsoluteCenter, useToast } from '@chakra-ui/react';
import { formatDistance } from 'date-fns';
import Markdown from 'markdown-to-jsx';

import { state as AppState } from './index';
import { getDateString } from './utils';
import { MdOrderedList, MdUnorderedList, MdCode } from './markdown';

type ChatMessage = AppState['messages'][number];

interface MessageItemProps {
  message: ChatMessage;
  isLast: boolean; // suppress the "time ago" divider on the last message
  user: any; // current user (for "is me" + color)
  users: any[]; // all users (to color other people's bubbles)
  appId: string; // this Chat app id, stamped on dragged-out stickies
  isFocused: boolean; // text is selectable only when the app is focused
  myColor: string;
  otherUserColor: string;
  sageColor: string;
  textColor: string;
  bgColor: string;
  toast: ReturnType<typeof useToast>;
}

/**
 * One row of the transcript: the user's question bubble (right/left depending on
 * author), the SAGE answer bubble (rendered as Markdown), and an optional
 * "time ago" divider when there's a gap before the next message. Both bubbles
 * are draggable to the board (creates a Stickie) and copy-on-double-click.
 */
export function MessageItem(props: MessageItemProps): JSX.Element {
  const { message, isLast, user, users, appId, isFocused, myColor, otherUserColor, sageColor, textColor, bgColor, toast } = props;

  const isMe = user?._id == message.userId;
  const time = getDateString(message.creationDate);
  const now = Date.now();
  const diff = now - message.creationDate - 30 * 60 * 1000; // gap beyond 30 minutes
  const when = diff > 0 ? formatDistance(message.creationDate, now, { addSuffix: true }) : '';

  // Render single backticks as bold (markdown-to-jsx treats them as inline code)
  const response = message.response.replace(/`([^`\n]+)`/g, (match, p1) => `**${p1}**`);

  return (
    <Fragment>
      {/* Start of User Messages */}
      {message.query && message.query.length ? (
        <Box position="relative" my={1}>
          {isMe ? (
            <Box top="-15px" right={'15px'} position={'absolute'} textAlign={'right'}>
              <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                Me - {time}
              </Text>
            </Box>
          ) : (
            <Box top="-15px" left={'15px'} position={'absolute'} textAlign={'right'}>
              <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                {message.userName} - {time}
              </Text>
            </Box>
          )}

          <Box display={'flex'} justifyContent={isMe ? 'right' : 'left'}>
            <Tooltip
              whiteSpace={'nowrap'}
              textOverflow="ellipsis"
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Drag to board - Double-click to clipboard'}
              openDelay={400}
              closeDelay={2000}
            >
              <Box
                color="black"
                rounded={'md'}
                boxShadow="md"
                fontFamily="Arial"
                textAlign={isMe ? 'right' : 'left'}
                bg={isMe ? myColor : otherUserColor}
                px={2}
                py={1}
                m={3}
                maxWidth="70%"
                userSelect={isFocused ? 'text' : 'none'}
                onDoubleClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(message.query);
                    toast({
                      title: 'Success',
                      description: `Content Copied to Clipboard`,
                      duration: 3000,
                      isClosable: true,
                      status: 'success',
                    });
                  }
                }}
                draggable={!isFocused}
                // Store the query in the drag/drop payload to create a Stickie
                onDragStart={(e) => {
                  e.dataTransfer.clearData();
                  e.dataTransfer.setData('app', 'Stickie');
                  const colorMessage = isMe ? user?.data.color : users.find((u) => u._id === message.userId)?.data.color || 'blue';
                  e.dataTransfer.setData(
                    'app_state',
                    JSON.stringify({ color: colorMessage, text: message.query, fontSize: 24, sources: [appId] }),
                  );
                }}
              >
                {message.query}
              </Box>
            </Tooltip>
          </Box>
        </Box>
      ) : null}

      {/* Start of SAGE Messages */}
      {message.response && message.response.length ? (
        <Box position="relative" my={1} maxWidth={'70%'}>
          <Box top="0" left={'15px'} position={'absolute'} textAlign="left">
            <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
              {message.userName} - {time}
            </Text>
          </Box>

          <Box display={'flex'} justifyContent="left" position={'relative'} top={'15px'} mb={'15px'}>
            <Tooltip
              whiteSpace={'nowrap'}
              textOverflow="ellipsis"
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Drag to board - Double-click to clipboard'}
              openDelay={400}
              closeDelay={2000}
            >
              <Box
                boxShadow="md"
                color="black"
                rounded={'md'}
                textAlign={'left'}
                bg={sageColor}
                px={2}
                py={1}
                m={3}
                fontFamily="Arial"
                onDoubleClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(message.response);
                    toast({
                      title: 'Success',
                      description: `Content Copied to Clipboard`,
                      duration: 3000,
                      isClosable: true,
                      status: 'success',
                    });
                  }
                }}
              >
                <Box
                  draggable={!isFocused}
                  onDragStart={(e) => {
                    // Store the response in the drag/drop payload to create a Stickie
                    e.dataTransfer.clearData();
                    e.dataTransfer.setData('app', 'Stickie');
                    e.dataTransfer.setData(
                      'app_state',
                      JSON.stringify({ color: 'purple', text: message.response.trim(), fontSize: 24, sources: [appId] }),
                    );
                  }}
                >
                  <Box>
                    <Markdown
                      options={{
                        overrides: {
                          ol: { component: MdOrderedList },
                          ul: { component: MdUnorderedList },
                          code: { component: MdCode },
                        },
                      }}
                      style={{ userSelect: isFocused ? 'text' : 'none' }}
                    >
                      {response}
                    </Markdown>
                  </Box>
                </Box>
              </Box>
            </Tooltip>
          </Box>
        </Box>
      ) : null}

      {when && !isLast ? (
        <Box position="relative" padding="4">
          <Center>
            <Divider width={'80%'} borderColor={'ActiveBorder'} />
            <AbsoluteCenter bg={bgColor} px="4">
              {when}
            </AbsoluteCenter>
          </Center>
        </Box>
      ) : null}
    </Fragment>
  );
}
