/\*\*

- Copyright (c) SAGE3 Development Team
-
- Distributed under the terms of the SAGE3 License. The full license is in
- the file LICENSE, distributed as part of this software.
- \*/

import { useEffect, useState } from 'react';
import { App } from '../../schema';
import { Textarea } from '@chakra-ui/react'

import { state as AppState } from './index';
import { AppWindow } from '../../components';

import { usePeerStore } from '@sage3/frontend';

function RTCChat(props: App): JSX.Element {
const s = props.data.state as AppState;
const [chatLines, setChatLines] = useState<string[]>([]);

// Peer
const peer = usePeerStore((state) => state.peer);
const peerDestroy = usePeerStore((state) => state.destroy);

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

    // const rtcsock = new WebSocket(`wss://${window.location.host}/rtc`);
    const rtcsock = new WebSocket(`ws://localhost:3333/rtc`);
    rtcsock.addEventListener('open', (event) => {
      console.log('RTC> Connection Open');
    });
    const processRTCMessage = async (ev: MessageEvent<any>) => {
      console.log('RTC> Message', ev);
      const data = JSON.parse(ev.data);
      if (data.type === 'signal') {
        console.log('RTC> signal');
        await peer.signal(data.data);
      } else if (data.type === 'onicecandidates') {
        console.log('RTC> onicecandidates');
        const promises = data.data.map(async (candidate: any) => peer.addIceCandidate(candidate));
        await Promise.all(promises);
      }
    };

    rtcsock.addEventListener('message', processRTCMessage);
    rtcsock.addEventListener('close', (ev) => {
      console.log('RTC> Close', ev);
      rtcsock.removeEventListener('message', processRTCMessage);
    });
    rtcsock.addEventListener('error', (ev) => {
      console.log('RTC> Error', ev);
      rtcsock.removeEventListener('message', processRTCMessage);
    });
    console.log('RTC> Peer', peer);
    peer.on('signal', async (description) => {
      if (rtcsock.readyState === rtcsock.OPEN) {
        rtcsock.send(JSON.stringify({ type: 'signal', data: description }));
      }
    });
    peer.on('onicecandidates', async (candidates) => {
      if (rtcsock.readyState === rtcsock.OPEN) {
        rtcsock.send(JSON.stringify({ type: 'onicecandidates', data: candidates }));
      }
    });
    peer.on('streamLocal', (stream) => {
      // document.querySelector('#videoLocal').srcObject = stream;
      console.log('RTC> Local Stream', stream);
    });
    peer.on('streamRemote', (stream) => {
      // document.querySelector('#videoRemote').srcObject = stream;
      console.log('RTC> Remote Stream', stream);
    });
    peer.on('channelData', processMsg);

    setTimeout(() => {
      // const stream = await Peer.getUserMedia();
      // peer.addStream(stream);
      peer.start();
      // setInterval(() => {
      //   peer.send("Hello", 'messages');
      // }, 2000);
    }, 1000);

    return () => {
      console.log('RTC> Chat App Stopped');
      rtcsock.removeEventListener('message', processRTCMessage);
      rtcsock.close();
      peer.off('channelData', processMsg);
      peerDestroy();
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
