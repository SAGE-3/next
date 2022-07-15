/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, HStack, Button, VStack, Tag, Code } from '@chakra-ui/react';
import { useAppStore, useUser, usePeer } from '@sage3/frontend';
import Peer from 'peerjs';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const { user } = useUser();
  const [mine, setMine] = useState(false);
  const [status, setStatus] = useState('Status> off');
  const selfView = useRef<HTMLVideoElement>(null);

  const localStream = useRef<MediaStream>();
  const mePeer = useRef<Peer>();

  //  Message from RTC clients
  const msgHandler = (id: string, data: any) => {
    const remoteUser = id.split('-')[0];
    console.log('RTC> Callback', remoteUser, data);
  }

  //  Events from RTC clients
  const evtHandler = (type: string, data: any) => {
    // Late joiner
    if (type === 'join') {
      if (localStream.current && mePeer.current) {
        mePeer.current.call(data, localStream.current);
      }
    }
  }

  //  Events from RTC clients
  const callHandler = (stream: MediaStream) => {
    console.log('RTC> call', stream);
    if (selfView.current) {
      const videoTrack = stream.getVideoTracks()[0];
      // Video tag got some metadata
      selfView.current.onloadedmetadata = () => {
        const settings = videoTrack.getSettings();
        const w = settings.width;
        const h = settings.height;
        setStatus('Stream> ' + w + 'x' + h);
      };
      selfView.current.srcObject = stream;
    }
  }

  // Use the web RTC hook and pass some data handlers
  const { me, connections } = usePeer({
    messageCallback: msgHandler,
    eventCallback: evtHandler,
    callCallback: callHandler,
  });
  mePeer.current = me;

  useEffect(() => {
    if (user && props.data.ownerId === user._id) {
      // Update the local state
      setMine(true);
    }
    return () => {
      // Closing the sharing session
      if (mine) {
        handleStop();
      }
    }
  }, [mine]);

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
      setStatus('Status> off');
      if (selfView.current) selfView.current.srcObject = null;
    }
  }, [s.running]);


  //  Call all RTC clients
  const rtcCall = useCallback((data: MediaStream) => {
    for (const c in connections) {
      if (me) {
        me.call(connections[c].peer, data);
      }
    }
  }, [connections]);

  function handleStart() {
    let selectedDevice = '';
    window.navigator.mediaDevices.enumerateDevices()
      .then(function (devices) {
        devices.forEach(function (device: MediaDeviceInfo, idx: number) {
          if (device.kind === "videoinput") {
            console.log('>' + idx + ': ' + device.kind + ": " + device.label + " id = " + device.deviceId);
            // Select the first camera
            if (!selectedDevice) {
              selectedDevice = device.deviceId;
              console.log('Video input> selected', device);
            }
          }
        });
      })
      .catch(function (err) {
        console.log('mediaDevices>', err.name + ": " + err.message);
      }).finally(function () {
        console.log('mediaDevices> device selected', selectedDevice);

        // For video camera, we need to specify the video source
        // const constraints = {
        //   audio: false, video: {
        //     width: 720, height: 430, frameRate: 30,
        //     deviceId: selectedDevice || undefined
        //   }
        // } as MediaStreamConstraints;

        // For screenshare, different constraints are needed
        const constraints = {
          audio: true,
          video: {
            chromeMediaSource: 'desktop',
            width: 1024,
            height: 720,
            frameRate: 5,
            // maxWidth: 1280,
            // maxHeight: 720,
            // minWidth: 640,
            // minHeight: 480,
            cursor: "always"
          },
        } as MediaStreamConstraints;

        // window.navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        window.navigator.mediaDevices.getDisplayMedia(constraints).then((stream) => {
          localStream.current = stream;
          // for desktop sharing, limit a bit
          stream.getTracks()[0].applyConstraints({ frameRate: { max: 5 } });
          const settings = stream.getVideoTracks()[0].getSettings();
          const w = settings.width;
          const h = settings.height;
          const fps = settings.frameRate;
          setStatus('Stream> ' + w + 'x' + h + '@' + fps + 'fps');
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
    updateState(props._id, { running: false });
    if (selfView.current) {
      if (selfView.current.srcObject) {
        const stream = selfView.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      selfView.current.srcObject = null;
    }
  }


  return (
    <AppWindow app={props} >
      <VStack h="100%" w="100%">
        <Box bgColor="black" color="white" w={"100%"} minH={"75%"} p={0}>
          <video ref={selfView} autoPlay={true} width={"100%"} height={"100%"} />
        </Box>
        <HStack w="100%" >
          <Code fontSize={"xs"}>{status}</Code>
        </HStack>
        <HStack w="100%" >
          {mine && <>
            <Button onClick={handleStart} disabled={s.running} colorScheme="green">
              Start
            </Button>
            <Button onClick={handleStop} disabled={!s.running} colorScheme="red">
              Stop
            </Button></>
          }
          <Tag p={3}>{s.running ? "Started" : "Stopped"} </Tag>
        </HStack>
      </VStack>
    </AppWindow >
  );
}

function ToolbarComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <>
    </>
  )
}

export default { AppComponent, ToolbarComponent };
