/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// React imports
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
// Peerjs module
import { Peer, DataConnection } from 'peerjs';
import { useUser } from '@sage3/frontend';

type usePeerProps = {
  messageCallback: (id: string, data: any) => void
  eventCallback: (type: string, data: any) => void
}

export function usePeer(props: usePeerProps): DataConnection[] {
  const [connections, setConnections] = useState<Array<DataConnection>>([]);
  const { user } = useUser();

  const location = useLocation();
  const locationState = location.state as { boardId: string; roomId: string; };

  // User's identity
  const me = useRef<Peer>();
  // Websocket to communicate with the server
  const rtcSock = useRef<WebSocket>();

  useEffect(() => {
    console.log('RTC> usePeer Started');
    if (!user) return;

    const processRTCMessage = (ev: MessageEvent<any>) => {
      const data = JSON.parse(ev.data);
      console.log('RTC> Message', data.type);
      if (data.type === 'join') {
        const newpeer = data.data;
        console.log('RTC> join', newpeer);
        const conn = peer.connect(newpeer);
        conn.on("open", () => {
          setConnections((prev) => {
            const userArrived = data.data.split('-')[0];
            const ids = prev.map((c) => c.peer);
            if (userArrived in ids) {
              console.log('RTC> User already connected', userArrived);
              return prev;
            } else {
              if (props.eventCallback) props.eventCallback('join', data.data);
              console.log('RTC> Connected me', user._id, 'to', newpeer);
              return [...prev, conn];
            }
          });
        });
        conn.on("close", () => {
          setConnections((prev) => {
            if (props.eventCallback) props.eventCallback('leave', conn.peer);
            const idx = prev.findIndex((el) => el === conn);
            if (idx > -1) {
              prev.splice(idx, 1);
            }
            return [...prev]
          });
        });
        conn.on("error", (err) => {
          console.log('RTC> Conn Error', err);
          setConnections((prev) => {
            const idx = prev.findIndex((el) => el === conn);
            if (idx > -1) {
              prev.splice(idx, 1);
            }
            return [...prev]
          });
        });
      } else if (data.type === 'left') {
        setConnections((prev) => {
          for (const c in prev) {
            if (prev[c].peer === data.data) {
              prev[c].close();
            }
          }
          const idx = prev.findIndex((el) => el.peer === data.data);
          if (idx > -1) {
            prev.splice(idx, 1);
          }
          return [...prev];
        });
      } else if (data.type === 'clients') {
        console.log('RTC> clients', data.data);
        const existingPeers = data.data;
        for (const k in existingPeers) {
          if (existingPeers[k] !== user._id) {
            const conn = peer.connect(existingPeers[k]);
            conn.on("open", () => {
              setConnections((prev) => {
                const userArrived = conn.peer;
                const ids = prev.map((c) => c.peer);
                if (userArrived in ids) {
                  console.log('RTC> User already connected', userArrived);
                  return prev;
                } else {
                  if (props.eventCallback) props.eventCallback('join', conn.peer);
                  console.log('RTC> Connected me', user._id, 'to', userArrived);
                  return [...prev, conn];
                }
              });

            });
            conn.on("close", () => {
              console.log('RTC> Conn close');
              setConnections((prev) => {
                const idx = prev.findIndex((el) => el === conn);
                if (idx > -1) {
                  prev.splice(idx, 1);
                }
                return [...prev];
              });
            });
            conn.on("error", (err) => {
              console.log('RTC> Conn Error', err);
              setConnections((prev) => {
                const idx = prev.findIndex((el) => el === conn);
                if (idx > -1) {
                  prev.splice(idx, 1);
                }
                return [...prev];
              });
            });
          }
        }
      }
    }

    const peer = new Peer(user._id);
    peer.on('open', function (id) {
      me.current = peer;
      console.log('RTC> Me Peer', id);

      peer.on('connection', function (conn) {
        // Receive messages
        conn.on('data', function (data) {
          const remoteUser = conn.peer.split('-')[0];
          console.log('RTC> message:', remoteUser, '-', data);
          if (props.messageCallback) props.messageCallback(conn.peer, data);
        });
      });

      peer.on('close', function () {
        console.log('RTC> Peer closed');
      });

      peer.on('error', function (err) {
        console.log('RTC> Peer error', err);
      });

      // Open websocket connection to the server
      const socketType = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${socketType}//${window.location.host}/rtc/${locationState.roomId}`;
      console.log('RTC> Connecting to', socketUrl);
      rtcSock.current = new WebSocket(socketUrl);
      rtcSock.current.addEventListener('open', () => {
        console.log('RTC> WS Connection Open');
        if (rtcSock.current) rtcSock.current.send(JSON.stringify({ type: 'join', user: user._id }));
      });

      rtcSock.current.addEventListener('message', processRTCMessage);
      rtcSock.current.addEventListener('close', () => {
        console.log('RTC> WS Close');
        if (rtcSock.current) rtcSock.current.removeEventListener('message', processRTCMessage);
      });
      rtcSock.current.addEventListener('error', (ev) => {
        console.log('RTC> WS Error', ev);
        if (rtcSock.current) rtcSock.current.removeEventListener('message', processRTCMessage);
      });
    });

    return () => {
      console.log('RTC> usePeer Stopped');
      if (rtcSock.current && rtcSock.current.readyState === WebSocket.OPEN) {
        rtcSock.current.removeEventListener('message', processRTCMessage);
        rtcSock.current.close();
      }
      // for (const c in connections) {
      //   console.log('RTC> Close connection', connections[c].peer);
      //   connections[c].close();
      // }
      peer.disconnect();
      peer.destroy();
    };
  }, [user, locationState.roomId]);

  return connections;
}
