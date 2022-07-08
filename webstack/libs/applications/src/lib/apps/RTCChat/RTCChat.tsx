/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { App } from '../../schema';
import { Textarea } from '@chakra-ui/react'

import { state as AppState } from './index';
import { AppWindow } from '../../components';

import { usePeerStore } from '@sage3/frontend';
import { previousDay } from 'date-fns';

function RTCChat(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [chatLines, setChatLines] = useState<string[]>([]);
  const peer = usePeerStore((state) => state.peer);

  const handleChat = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = e.currentTarget.value;
      const newChatLines = [...chatLines, text];
      setChatLines(newChatLines);
      e.currentTarget.value = '';

      peer.send(text, 'messages');
    }
  };

  const processMsg = (stream: any) => {
    if (stream.source === 'incoming') {
      console.log('RTC> Channel Data', stream.data, stream.source);
      setChatLines((prev) => [...prev, stream.data.toString()]);
    }
  };

  useEffect(() => {
    console.log('RTC> Chat App Started');
    peer.on('channelData', processMsg);
    return () => {
      console.log('RTC> Chat App Stopped');
      peer.off('channelData', processMsg);
    }
  }, []);

  return (
    <AppWindow app={props}>
      <>
        <h1>Room : {s.room}</h1>
        <h2>Chat</h2>
        <ul>
          {chatLines.map((line, i) => (
            <li key={i}>{i} : {line}</li>
          ))}
        </ul>
        <h2>Input</h2>
        <Textarea placeholder='Type to chat'
          onKeyDown={handleChat}
          size='sm'
          rows={1}
        />
      </>
    </AppWindow>
  );
}

export default RTCChat;
