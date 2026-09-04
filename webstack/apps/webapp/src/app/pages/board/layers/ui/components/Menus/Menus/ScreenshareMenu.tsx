/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React and Chakra Imports
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';

// SAGE3 Imports
import { App } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import {
  useAppStore,
  useHexColor,
  useScreenshareStore,
  useUIStore,
  useUser,
  useUsersStore,
  useScreenshareBackend,
  truncateWithEllipsis,
  isElectron,
} from '@sage3/frontend';

// Props for the ScreensharesMenu component
interface ScreensharesMenuProps {
  roomId: string;
  boardId: string;
  onActionComplete?: () => void;
}

// Screenshare app types: 'Screenshare' is Twilio, 'LocalScreenshare' is the self-hosted LiveKit SFU.
// Both are listed no matter which backend is active, so a board that still carries shares
// from the other implementation shows them all in one place.
const screenshareTypes = ['Screenshare', 'LocalScreenshare'];

// Capture constraints: cap resolution and framerate
const captureConstraints = {
  width: { ideal: 1920, max: 1920 },
  height: { ideal: 1920, max: 1920 },
  frameRate: { ideal: 20, max: 20 },
};

type ElectronSource = {
  appIcon: null | string;
  display_id: string;
  id: string;
  name: string;
  thumbnail: string;
};

/**
 * A Board UI Component that is a drop down list of available screenshares on the board.
 * Will show a list of users that are currently screensharing.
 * When a user is selected, the user's view will shift to the screenshare's location.
 * The user can also start and stop his own screenshare.
 * This menu is the only place a screenshare can be started.
 */
export function ScreenshareMenu(props: ScreensharesMenuProps) {
  // Stores (Users, Apps, UI)
  const { user, accessId } = useUser();
  const uid = user?._id;
  const users = useUsersStore((state) => state.users);
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const createApp = useAppStore((state) => state.create);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);
  const goToApp = useUIStore((state) => state.fitApps);

  // Screenshare Store (LiveKit)
  const shareStream = useScreenshareStore((state) => state.shareStream);

  // Which screenshare backend this server offers ('livekit', 'twilio' or 'none').
  // The server decides from its own credentials; the UI never offers what is not configured.
  const backend = useScreenshareBackend();

  // Local State
  const [screenshares, setScreenshares] = useState<App[]>([]);
  const [yourScreenshare, setYourScreenshare] = useState<App | null>(null);

  // Electron source picker
  const [electronSources, setElectronSources] = useState<ElectronSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<ElectronSource | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Color
  const bgHoverColor = useColorModeValue('gray.100', 'gray.600');
  const bgHoverHexColor = useHexColor(bgHoverColor);
  const teal = useHexColor('teal');

  // Use effect that tracks the lenght of the apps array and updates the screenshares state
  useEffect(() => {
    setScreenshares(apps.filter((app) => screenshareTypes.includes(app.data.type)));
    const yourScreenshare = apps.find((app) => screenshareTypes.includes(app.data.type) && app._createdBy === user?._id);
    yourScreenshare ? setYourScreenshare(yourScreenshare) : setYourScreenshare(null);
    // Depend on the apps themselves: a share can be replaced without the count changing
  }, [apps, user?._id]);

  // Function that handles the user going to the specfied screenshare app
  const handleGoToApp = (selectedApp: App) => {
    const goToScreenshare = apps.find((app) => selectedApp._id == app._id);
    if (goToScreenshare) {
      goToApp([goToScreenshare]);
    }
  };

  // Stop your Screenshare
  const stopYourScreenshare = () => {
    if (yourScreenshare) {
      deleteApp(yourScreenshare?._id);
    }
  };

  // Create the screenshare app for an already-captured stream and hand the stream to the store.
  // Capture happens BEFORE the app exists: cancelling the picker never creates an app.
  const createShareApp = async (stream: MediaStream) => {
    if (!user) return;
    const settings = stream.getVideoTracks()[0]?.getSettings();
    const aspectRatio = settings?.width && settings?.height ? settings.width / settings.height : 16 / 9;
    const width = 1280;
    const height = width / aspectRatio;
    const size = { height, width, depth: 0 };
    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - width / 2);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - height / 2);
    const position = { x, y, z: 0 };
    const result = await createApp({
      title: 'Screenshare by ' + user.data.name,
      roomId: props.roomId,
      boardId: props.boardId,
      position,
      size,
      rotation: { x: 0, y: 0, z: 0 },
      type: 'LocalScreenshare',
      state: { ...(initialValues['LocalScreenshare'] as any), aspectRatio },
      raised: true,
      dragging: false,
      pinned: false,
    });

    // The create route returns the new document wrapped in an array
    const created = Array.isArray(result?.data) ? result.data[0] : result?.data;
    if (result?.success && created) {
      // The store owns the capture from here: it publishes once the room connects
      shareStream(created._id, stream);
      props.onActionComplete?.();
    } else {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Start a screenshare using whichever backend the server offers. The backend is not
  // selectable: a server with both configured would otherwise let users start a share on
  // the one nobody else is connected to, which shows up as a blank screenshare.
  const startYourScreenshare = async () => {
    if (!user || yourScreenshare) return;
    // Log which one was used, for debugging on servers that have both configured
    console.log('Screenshare> starting with backend:', backend);
    if (backend === 'twilio') return startTwilioScreenshare();
    if (backend === 'livekit') return startLiveKitScreenshare();
  };

  // LiveKit: capture first (inside the click gesture), then create the app
  const startLiveKitScreenshare = async () => {
    if (isElectron()) {
      // Electron has no native picker: list the sources in a modal
      // One reply per request: 'once' removes itself, and clearing first drops any listener a
      // previous click left behind (the preload wraps callbacks, so removeListener cannot).
      window.electron.removeAllListeners('set-source');
      window.electron.once('set-source', async (sources: ElectronSource[]) => {
        setElectronSources(sources);
        setSelectedSource(null);
        onOpen();
      });
      window.electron.send('request-sources');
    } else {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: captureConstraints });
      } catch (err) {
        // User cancelled the browser picker: nothing to clean up
        return;
      }
      await createShareApp(stream);
    }
  };

  // Electron: capture the selected source and proceed
  const electronShareHandle = async () => {
    if (!selectedSource) return;
    const mediaDevices = navigator.mediaDevices as any;
    const stream = await mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.id,
          maxWidth: 1920,
          maxHeight: 1920,
          maxFrameRate: 20,
        },
      },
    });
    onClose();
    await createShareApp(stream);
  };

  // Twilio screenshare (legacy): create the app, the app component starts the capture
  const startTwilioScreenshare = async () => {
    if (!user) return;
    const width = 1280;
    const height = 720;
    const size = { height, width, depth: 0 };
    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - height / 2);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - width / 2);
    const position = { x, y, z: 0 };
    const result = await createApp({
      title: 'Screenshare by ' + user.data.name,
      roomId: props.roomId,
      boardId: props.boardId,
      position,
      size,
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Screenshare',
      state: { ...(initialValues['Screenshare'] as any), accessId },
      raised: true,
      dragging: false,
      pinned: false,
    });

    if (result?.success) {
      props.onActionComplete?.();
    }
  };

  return (
    <Box maxHeight="60svh" overflowY={'auto'} overflowX="clip" width="200px">
      {screenshares.map((app) => {
        const user = users.find((u) => u._id === app._createdBy);
        if (!user) return null;
        const userName = user.data.name;
        const trimName = truncateWithEllipsis(userName, 14);
        // const color = user.data.color;
        const yours = app._createdBy === uid;
        return (
          <Box
            display="flex"
            justifyContent="left"
            gap="2"
            my="1"
            key={app._id}
            onClick={() => handleGoToApp(app)}
            _hover={{ cursor: 'pointer', bg: bgHoverHexColor }}
            transition="background-color 0.4s"
            p="2"
            borderRadius="md"
            height="24px"
            alignItems={'center'}
          >
            <MdPerson size="16px" />
            <Text fontSize="14px">
              {trimName} {yours ? '(Yours)' : ''}
            </Text>
          </Box>
        );
      })}
      {screenshares.length === 0 && (
        <Text ml="6px" cursor="default">
          No Screenshares
        </Text>
      )}
      <Divider my="2" />
      {/* The server has no screenshare backend configured: say so rather than
          offering a button that cannot work */}
      {backend === 'none' ? (
        <Text ml="6px" fontSize="12px" opacity={0.8} cursor="default">
          Screensharing is not enabled on this server
        </Text>
      ) : yourScreenshare == null ? (
        <Button onClick={() => startYourScreenshare()} py="1px" m="0" width="100%" size="xs" colorScheme="green">
          Start Sharing
        </Button>
      ) : (
        <Button onClick={() => stopYourScreenshare()} py="1px" m="0" width="100%" size="xs" colorScheme="red">
          Stop Sharing
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="xl" blockScrollOnMount={false} closeOnOverlayClick={false} closeOnEsc={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Screenshare Source</ModalHeader>
          <ModalBody maxHeight="60vh" overflowY="scroll">
            <Tabs isFitted>
              <TabList mb="1em">
                <Tab>Screens</Tab>
                <Tab>Windows</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <SimpleGrid columns={3} spacing={10}>
                    {electronSources
                      .filter((el) => el.display_id !== '')
                      .map((source, idx: number) => (
                        <Box
                          display="flex"
                          flexDir="column"
                          justifyItems="center"
                          borderRadius="md"
                          border={selectedSource && selectedSource.id === source.id ? 'solid teal 2px' : ''}
                          borderColor={teal}
                          height="100%"
                          width="100%"
                          p="1"
                          key={idx}
                          onClick={() => setSelectedSource(source)}
                        >
                          <Box width="100%">
                            <Text overflow="hidden" fontSize="sm" width="100%" height="20px">
                              Screen: {source.display_id}
                            </Text>
                          </Box>
                          <img height="200px" width="200px" src={source.thumbnail} alt="" />
                        </Box>
                      ))}
                  </SimpleGrid>
                </TabPanel>
                <TabPanel>
                  <SimpleGrid columns={3} spacing={10}>
                    {electronSources
                      .filter((el) => el.display_id === '')
                      .map((source, idx: number) => (
                        <Box
                          display="flex"
                          flexDir="column"
                          justifyItems="center"
                          borderRadius="md"
                          border={selectedSource && selectedSource.id === source.id ? 'solid teal 2px' : ''}
                          borderColor={teal}
                          height="100%"
                          width="100%"
                          p="1"
                          key={idx}
                          onClick={() => setSelectedSource(source)}
                        >
                          <Box width="100%">
                            <Text overflow="hidden" fontSize="sm" width="100%" height="20px">
                              {source.name}
                            </Text>
                          </Box>
                          <Image src={source.thumbnail} alt="" objectFit="contain" />
                        </Box>
                      ))}
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="red" mr="2" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="teal" isDisabled={!selectedSource} onClick={electronShareHandle}>
              Share
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
