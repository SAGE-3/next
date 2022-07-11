/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef } from 'react';
import { Textarea } from '@chakra-ui/react';
import { useAppStore, useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

import { Peer, DataConnection } from 'peerjs';

function RTCChat(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const [connections, setConnections] = useState<Array<DataConnection>>([]);
  const [chatLines, setChatLines] = useState<string[]>([]);
  const { user } = useUser();
  const me = useRef<Peer>();

  if (!user) return <></>;

  useEffect(() => {
    const numclients = connections.length + 1;
    const newInfo = "RTCChat> " + numclients + " clients connected";
    update(props._id, { description: newInfo });
  }, [connections]);


  const rtcBroadcast = (data: any) => {
    for (const c in connections) {
      connections[c].send(data);
    }
  }

  const handleChat = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = e.currentTarget.value;
      const newChatLines = [...chatLines, text];
      setChatLines(newChatLines);
      e.currentTarget.value = '';

      // Send over the RTC connections
      rtcBroadcast(text);
    }
  };

  useEffect(() => {
    console.log('RTC> Chat App Started');
    let rtcsock: WebSocket | null = null;

    const processRTCMessage = async (ev: MessageEvent<any>) => {
      const data = JSON.parse(ev.data);
      console.log('RTC> Message', data.type);
      if (data.type === 'join') {
        const newpeer = data.data;
        console.log('RTC> join', newpeer);
        const conn = peer.connect(newpeer);
        conn.on("open", () => {
          setConnections((prev) => [...prev, conn]);
          setChatLines((prev) => [...prev, (data.data + '> ENTERED')]);
          console.log('RTC> Connected me', user._id, 'to', newpeer);
        });
      } else if (data.type === 'left') {
        setChatLines((prev) => [...prev, (data.data + '> LEFT')]);
      } else if (data.type === 'clients') {
        console.log('RTC> clients', data.data);
        const existingPeers = data.data;
        for (const k in existingPeers) {
          if (existingPeers[k] !== user._id) {
            const conn = peer.connect(existingPeers[k]);
            conn.on("open", () => {
              setConnections((prev) => [...prev, conn]);
              console.log('RTC> Connected me', user._id, 'to', existingPeers[k]);
            });
          }
        }
      }
    };

    const peer = new Peer(user._id);
    peer.on('open', function (id) {
      me.current = peer;
      console.log('RTC> Me Peer', id);

      peer.on('connection', function (conn) {
        // Receive messages
        conn.on('data', function (data) {
          setChatLines((prev) => [...prev, (conn.peer + '> ' + data)]);
        });
      });


      rtcsock = new WebSocket(`wss://${window.location.host}/rtc`);
      // rtcsock = new WebSocket(`ws://localhost:3333/rtc`);
      rtcsock.addEventListener('open', () => {
        console.log('RTC> Connection Open');
        if (rtcsock) rtcsock.send(JSON.stringify({ type: 'join', user: user._id }));
      });

      rtcsock.addEventListener('message', processRTCMessage);
      rtcsock.addEventListener('close', (ev) => {
        console.log('RTC> Close', ev);
        if (rtcsock) rtcsock.removeEventListener('message', processRTCMessage);
      });
      rtcsock.addEventListener('error', (ev) => {
        console.log('RTC> Error', ev);
        if (rtcsock) rtcsock.removeEventListener('message', processRTCMessage);
      });
    });

    return () => {
      console.log('RTC> Chat App Stopped');
      if (rtcsock && rtcsock.readyState === WebSocket.OPEN) {
        rtcsock.removeEventListener('message', processRTCMessage);
        rtcsock.close();
      }
      peer.destroy();
    };
  }, []);

  return (
    <AppWindow app={props}>
      <>
        <h2>Chat</h2>
        <ul>
          {chatLines.map((line, i) => (
            <li key={i}>
              {i} : {line}
            </li>
          ))}
        </ul>
        <h2>Input</h2>
        <Textarea placeholder="Type to chat" onKeyDown={handleChat} size="sm" rows={1} />
      </>
    </AppWindow>
  );
}

export default RTCChat;
