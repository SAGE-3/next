/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Chakra and React imports
import { useEffect, useRef, useState } from 'react';
import { Box, Button, Text, SimpleGrid, useDisclosure } from '@chakra-ui/react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from '@chakra-ui/react';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// SAGE imports
import { useAppStore, useUser, useTwilioStore, useUsersStore } from '@sage3/frontend';
import { genId } from '@sage3/shared';

// Twilio Imports
import { LocalVideoTrack } from 'twilio-video';

// Icons
import { MdScreenShare } from 'react-icons/md';

type ElectronSource = {
  appIcon: null | string;
  display_id: string;
  id: string;
  name: string;
  thumbnail: string;
};

/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Current User
  const { user } = useUser();

  // User store to get name of user who created screenshare
  const users = useUsersStore((state) => state.users);
  const userWhoCreated = users.find((u) => u._id === props._createdBy);

  // Twilio Store
  const room = useTwilioStore((state) => state.room);
  const tracks = useTwilioStore((state) => state.tracks);

  // App Store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  // Video and HTML Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Electron media sources
  const [electronSources, setElectronSources] = useState<ElectronSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<ElectronSource | null>(null);

  // Modal window
  const { isOpen, onOpen, onClose } = useDisclosure();

  const shareScreen = async () => {
    stopStream();
    if (room && videoRef.current) {
      // Load electron and the IPCRender
      if (isElectron()) {
        const electron = window.require('electron');
        const ipcRenderer = electron.ipcRenderer;
        // Get sources from the main process
        ipcRenderer.on('set-source', async (evt: any, sources: any) => {
          // Check all sources and list for screensharing
          const allSources = [] as ElectronSource[]; // Make separate object to pass into the state
          for (const source of sources) {
            allSources.push(source);
          }
          setElectronSources(allSources);
          onOpen();
        });
        ipcRenderer.send('request-sources');
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        const videoId = genId();
        const screenTrack = new LocalVideoTrack(stream.getTracks()[0], { name: videoId, logLevel: 'off' });
        room.localParticipant.publishTrack(screenTrack);
        await updateState(props._id, { videoId });
      }
    }
  };

  const stopStream = () => {
    if (room) {
      const videoId = s.videoId;
      // console.log(room.localParticipant.tracks);
      const track = Array.from(room.localParticipant.videoTracks.values()).find((el) => el.trackName === videoId);
      // console.log(track);
      track?.unpublish();
      track?.track.stop();
      updateState(props._id, { videoId: '' });
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        // console.log('STOP:', track);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (user?._id === props._createdBy) return;
    tracks.forEach((track) => {
      if (track.name === s.videoId && videoRef.current) {
        track.attach(videoRef.current);
      }
    });
  }, [tracks, s.videoId]);

  useEffect(() => {
    stopStream();
    if (user?._id === props._createdBy) update(props._id, { description: `Screenshare> ${user.data.name}` });
    return () => {
      stopStream();
    };
  }, []);

  const selectElectronSource = (source: ElectronSource) => {
    setSelectedSource(source);
  };

  const electronShareHandle = async () => {
    if (selectedSource && room && videoRef.current) {
      selectedSource.id;
      const mediaDevices = navigator.mediaDevices as any;
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
          },
        },
      });

      videoRef.current.srcObject = stream;
      videoRef.current.play();
      const videoId = genId();
      const screenTrack = new LocalVideoTrack(stream.getTracks()[0], { name: videoId, logLevel: 'off' });
      room.localParticipant.publishTrack(screenTrack);
      await updateState(props._id, { videoId });
      onClose();
    }
  };

  return (
    <AppWindow app={props}>
      <>
        <Box display="flex" flexDir="column" borderRadius="0 0 6px 6px">
          <Box backgroundColor="black" height={props.data.size.height - 50 + 'px'}>
            <video ref={videoRef} className="video-container" width="100%" height="100%"></video>
          </Box>

          <Box backgroundColor="gray" display="flex" justifyContent="center" height="50px" p="5px" borderRadius="0 0 6px 6px">
            {user?._id === props._createdBy ? (
              <Button
                colorScheme={videoRef.current?.srcObject ? 'red' : 'green'}
                onClick={videoRef.current?.srcObject ? stopStream : shareScreen}
                disabled={!room}
                mx={1}
                rightIcon={<MdScreenShare />}
              >
                {videoRef.current?.srcObject ? 'Stop Sharing' : 'Share Screen'}
              </Button>
            ) : (
              <Text fontSize="sm" color="white">
                {userWhoCreated?.data.name} is sharing their screen
              </Text>
            )}
          </Box>
        </Box>
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Select Screenshare Source</ModalHeader>
            <ModalCloseButton />
            <ModalBody maxHeight="60vh" overflowY="scroll">
              <SimpleGrid columns={3} spacing={10}>
                {electronSources.map((source, idx: number) => (
                  <Box
                    display="flex"
                    flexDir="column"
                    justifyItems="center"
                    borderRadius="md"
                    border={selectedSource && selectedSource.id === source.id ? 'solid teal 2px' : ''}
                    height="120px"
                    width="100%"
                    p="1"
                    key={idx}
                    onClick={() => selectElectronSource(source)}
                  >
                    <Box width="100%">
                      <Text overflow="hidden" fontSize="sm" width="100%" height="20px">
                        {source.name}
                      </Text>
                    </Box>
                    <img height="200px" width="200px" src={source.thumbnail} alt="" />
                  </Box>
                ))}
              </SimpleGrid>
              <Box display="flex"></Box>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="teal" disabled={!selectedSource} onClick={electronShareHandle}>
                Share
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    </AppWindow>
  );
}

/**
 * Check if browser is Electron based on the userAgent.
 * NOTE: this does a require check, UNLIKE web view app.
 *
 * @returns true or false.
 */
function isElectron() {
  const w = window as any; // eslint-disable-line
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron') && w.require;
}

/* App toolbar component for the app Twilio */

function ToolbarComponent(props: App): JSX.Element {
  return <></>;
}

export default { AppComponent, ToolbarComponent };
