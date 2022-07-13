/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useCallback } from 'react';
import { Textarea, Text, VStack, UnorderedList, ListItem } from '@chakra-ui/react';
import { useAppStore, useBoardStore, useUser, usePeer } from '@sage3/frontend';
import { useLocation } from 'react-router-dom';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

function RTCChat(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const boards = useBoardStore((state) => state.boards);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const [chatLines, setChatLines] = useState<string[]>([]);

  const { user } = useUser();

  const location = useLocation();
  useEffect(() => {
    const locationState = location.state as { boardId: string; roomId: string; };
    const board = boards.find((b) => b._id === locationState.boardId);
    // Store the room id in the state
    updateState(props._id, { board: board?.data.name });
  }, []);

  //  Message from RTC clients
  const msgHandler = (id: string, data: any) => {
    console.log('RTC> Callback', data);
    // const remoteUser = id.split('-')[0];
    setChatLines((prev) => [decodeURIComponent(data), ...prev]);
  }
  //  Events from RTC clients
  const evtHandler = (type: string, data: any) => {
    console.log('RTC> event', type, data);
    if (type === 'join') {
      const userArrived = data.split('-')[0];
      setChatLines((prev) => [(userArrived + '> ENTERED'), ...prev]);
    } else if (type === 'leave') {
      const userLeft = data.split('-')[0];
      setChatLines((prev) => [(userLeft + '> LEFT'), ...prev]);
    }
  }
  //  Events from RTC clients
  const callHandler = (stream: MediaStream) => {
    console.log('RTC> call', stream);
  }

  // Use the web RTC hook and pass some data handlers
  const { connections } = usePeer({
    messageCallback: msgHandler,
    eventCallback: evtHandler,
    callCallback: callHandler,
  });

  // Monitor  the number of connections
  useEffect(() => {
    const numclients = connections.length + 1;
    const newInfo = "RTCChat> " + numclients + " clients connected";
    console.log(newInfo);
    for (const c in connections) {
      console.log('RTC> Update connection', connections[c].peer);
    }
    update(props._id, { description: newInfo });
  }, [connections]);


  //  Broadcast message to all RTC clients
  const rtcBroadcast = useCallback((data: any) => {
    for (const c in connections) {
      // encode the string before sending
      connections[c].send(encodeURIComponent(data));
    }
  }, [connections]);


  const handleChat = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget.value) {
        const text = (user?.data.name || 'Me') + '> ' + e.currentTarget.value;
        // Add the line locally
        setChatLines((prev) => [text, ...prev]);
        // Clear the textarea
        e.currentTarget.value = '';
        // Send over the RTC connections
        rtcBroadcast(text);
      }
    }
  };

  return (
    <AppWindow app={props}>
      <VStack alignContent={"left"}
        align='stretch'
        height={'100%'}
      >
        <Text fontSize="xl">Chat in "{s.board}" </Text>
        <hr />
        <UnorderedList m={0} p={1} maxHeight={"150px"} overflowY="scroll" overflowX="hidden">
          {chatLines.map((line, i) => (
            <ListItem key={i}>
              {line}
            </ListItem>
          ))}
        </UnorderedList>
        <hr />
        <Text fontSize="xl">Type here</Text>
        <Textarea bg="white" textColor={"black"} placeholder="Type to chat" onKeyDown={handleChat} size="sm" rows={1} />
      </VStack>
    </AppWindow>
  );
}

export default RTCChat;
