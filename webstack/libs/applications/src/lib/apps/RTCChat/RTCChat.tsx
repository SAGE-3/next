/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useCallback } from 'react';
import { Textarea, Text, VStack, UnorderedList, ListItem } from '@chakra-ui/react';
import { useAppStore, useUser, usePeer } from '@sage3/frontend';
import { useLocation } from 'react-router-dom';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

function RTCChat(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const [chatLines, setChatLines] = useState<string[]>([]);

  const { user } = useUser();

  const location = useLocation();
  useEffect(() => {
    const locationState = location.state as { boardId: string; roomId: string; };
    updateState(props._id, { roomID: locationState.roomId });
  }, []);

  //  Message from RTC clients
  const msgHandler = (id: string, data: any) => {
    console.log('RTC> Callback', data);
    const remoteUser = id.split('-')[0];
    setChatLines((prev) => [(remoteUser + '> ' + data), ...prev]);
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

  const connections = usePeer({
    messageCallback: msgHandler,
    eventCallback: evtHandler
  });

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
      connections[c].send(data);
    }
  }, [connections]);


  const handleChat = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = 'Me> ' + e.currentTarget.value;
      setChatLines((prev) => [text, ...prev]);
      e.currentTarget.value = '';

      // Send over the RTC connections
      rtcBroadcast(text);
    }
  };

  return (
    <AppWindow app={props}>
      <VStack alignContent={"left"}
        align='stretch'
        height={'100%'}
      >
        <Text fontSize="xl">Chat in room {s.roomID.split('-')[0]} </Text>
        <hr />
        <UnorderedList m={0} p={1} maxHeight={"150px"} overflowY="scroll" overflowX="hidden">
          {chatLines.map((line, i) => (
            <ListItem key={i}>
              {'>'}  {line}
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
