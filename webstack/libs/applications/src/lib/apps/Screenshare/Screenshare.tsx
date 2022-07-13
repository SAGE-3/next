/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, HStack, Button, VStack, Tag } from '@chakra-ui/react';
import { useAppStore, useUser, usePeer } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';
import { MediaConnection } from 'peerjs';

function Screenshare(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const { user } = useUser();
  const [mine, setMine] = useState(false);
  const selfView = useRef<HTMLVideoElement>(null);
  const mycall = useRef<MediaConnection>();

  useEffect(() => {
    if (user && props.data.ownerId === user._id) {
      // Update the local state
      setMine(true);
    }
  }, []);

  //  Message from RTC clients
  const msgHandler = (id: string, data: any) => {
    const remoteUser = id.split('-')[0];
    console.log('RTC> Callback', remoteUser, data);
  }
  //  Events from RTC clients
  const evtHandler = (type: string, data: any) => {
    console.log('RTC> event', type, data);
  }
  //  Events from RTC clients
  const callHandler = (stream: MediaStream) => {
    console.log('RTC> call', stream);
    if (selfView.current) {
      console.log('Setting stream', stream.id);
      selfView.current.srcObject = stream;
    }
  }

  // Use the web RTC hook and pass some data handlers
  const { me, connections } = usePeer({
    messageCallback: msgHandler,
    eventCallback: evtHandler,
    callCallback: callHandler,
  });

  // Monitor  the number of connections
  useEffect(() => {
    const numclients = connections.length + 1;
    if (user) {
      const newInfo = "Screenshare> " + numclients + " clients";
      update(props._id, { description: newInfo });
    }
  }, [connections]);

  // Monitor  the number of connections
  useEffect(() => {
    if (s.running) {
      console.log('Screenshare> Starting');
    } else {
      console.log('Screenshare> Stopping');
      if (selfView.current) selfView.current.srcObject = null;
    }
  }, [s.running]);


  // Broadcast message to all RTC clients
  const rtcBroadcast = useCallback((data: any) => {
    for (const c in connections) {
      connections[c].send(encodeURIComponent(data));
    }
  }, [connections]);

  //  Call all RTC clients
  const rtcCall = useCallback((data: MediaStream) => {
    for (const c in connections) {
      if (me) {
        me.call(connections[c].peer, data);
      }
    }
  }, [connections]);

  function handleStart() {
    let selectedDevice: string;
    window.navigator.mediaDevices.enumerateDevices()
      .then(function (devices) {
        devices.forEach(function (device: MediaDeviceInfo, idx: number) {
          if (device.kind === "videoinput") {
            console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
            // if (device.label.includes("Logitech")) {
            if (idx === 0) {
              selectedDevice = device.deviceId;
              console.log('Video input> selected', device);
            }
          }
        });
      })
      .catch(function (err) {
        console.log('mediaDevices>', err.name + ": " + err.message);
      }).finally(function () {
        const constraints = {
          audio: false, video: {
            width: 720, height: 430, frameRate: 30,
            deviceId: selectedDevice || undefined
          }
        };
        window.navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
          if (me) {
            rtcCall(stream);
            if (selfView.current) {
              selfView.current.srcObject = stream;
            }
            updateState(props._id, { running: true });
          }
        },
          (err) => {
            console.error("Failed to get local stream", err);
          },
        );
      }
      );
  }

  /**
   * Stop the screenshare
   */
  function handleStop() {
    if (mycall.current) {
      mycall.current.close();
      updateState(props._id, { running: false });
    }
  }


  return (
    <AppWindow app={props} >
      <VStack h="100%" w="100%">
        <Box bgColor="black" color="white" w={"100%"} minH={"75%"} p={0}>
          <video ref={selfView} autoPlay={true} width={"100%"} height={"100%"} />
        </Box>
        <HStack w="100%" >
          {mine && <>
            <Button onClick={handleStart} colorScheme="green">
              Start
            </Button>
            <Button onClick={handleStop} colorScheme="red">
              Stop
            </Button></>
          }
          <Tag p={3}>{s.running ? "Started" : "Stopped"} </Tag>
        </HStack>
      </VStack>
    </AppWindow>
  );
}

export default Screenshare;
