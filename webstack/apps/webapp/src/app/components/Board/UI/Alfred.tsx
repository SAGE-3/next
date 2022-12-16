/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useCallback, useState } from 'react';
// Import Chakra UI elements
import {
  useDisclosure,
  Modal, ModalOverlay, ModalContent,
  InputGroup, Input, VStack, Button,
} from '@chakra-ui/react';

import { MdApps } from 'react-icons/md';

import {
  processContentURL,
  useAppStore,
  useHotkeys, HotkeysEvent,
  usePresenceStore,
  useUIStore,
  useUser,
  useData,
} from '@sage3/frontend';

import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppState } from '@sage3/applications/schema';
import { Applications } from '@sage3/applications/apps';

type props = {
  boardId: string;
  roomId: string;
};

export function Alfred(props: props) {
  // get features
  const data = useData('/api/info');
  // UI
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const displayUI = useUIStore((state) => state.displayUI);
  const hideUI = useUIStore((state) => state.hideUI);

  // Apps
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);

  // User
  const { user } = useUser();
  const presences = usePresenceStore((state) => state.presences);

  // Function to create a new app
  const newApplication = (appName: AppName) => {
    if (!user) return;

    if (appName === 'JupyterLab' && data.features && !data.features['jupyter']) return;
    if (appName === 'SageCell' && data.features && !data.features['cell']) return;
    if (appName === 'Screenshare' && data.features && !data.features['twilio']) return;

    // Get around  the center of the board
    const x = Math.floor(-boardPosition.x + window.innerWidth / scale / 2);
    const y = Math.floor(-boardPosition.y + window.innerHeight / scale / 2);

    createApp({
      title: appName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as AppState) },
      raised: true,
    });
  };

  // Alfred quick bar response
  const alfredAction = useCallback(
    (term: string) => {
      if (!user) return;

      // Get the position of the cursor
      const me = presences.find((el) => el.data.userId === user._id && el.data.boardId === props.boardId);
      const pos = me?.data.cursor || { x: 100, y: 100, z: 0 };
      const width = 400;
      const height = 400;
      pos.x -= width / 2;
      pos.y -= height / 2;
      // Decompose the search
      const terms = term.split(' ');

      if (terms[0] === 'app') {
        // app shortcuts
        const name = terms[1];
        // Check if it's a valid app name
        if (name in Applications) {
          newApplication(name as AppName);
        }
      } else if (terms[0] === 'w' || terms[0] === 'web' || terms[0] === 'webview') {
        if (terms[1]) {
          let loc = terms[1];
          if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
            loc = 'https://' + loc;
          }
          createApp({
            title: loc,
            roomId: props.roomId,
            boardId: props.boardId,
            position: pos,
            size: { width, height, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Webview',
            state: { webviewurl: processContentURL(loc) },
            raised: true,
          });
        }
      } else if (terms[0] === 'g' || terms[0] === 'goo' || terms[0] === 'google') {
        const rest = terms.slice(1).join('+');
        const searchURL = 'https://www.google.com/search?q=' + rest;
        createApp({
          title: searchURL,
          roomId: props.roomId,
          boardId: props.boardId,
          position: pos,
          size: { width, height, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Webview',
          state: { webviewurl: processContentURL(searchURL) },
          raised: true,
        });
      } else if (terms[0] === 's' || terms[0] === 'n' || terms[0] === 'stick' || terms[0] === 'stickie' || terms[0] === 'note') {
        const content = terms.slice(1).join(' ');
        createApp({
          title: user.data.name,
          roomId: props.roomId,
          boardId: props.boardId,
          position: pos,
          size: { width, height, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Stickie',
          state: { ...(initialValues['Stickie'] as AppState), text: content },
          raised: true,
        });
      } else if (terms[0] === 'c' || terms[0] === 'cell') {
        newApplication('SageCell');
      } else if (terms[0] === 'showui') {
        // Show all the UI elements
        displayUI();
      } else if (terms[0] === 'hideui') {
        // Hide all the UI elements
        hideUI();
      } else if (terms[0] === 'clear' || terms[0] === 'clearall' || terms[0] === 'closeall') {
        apps.forEach((a) => deleteApp(a._id));
      }
    },
    [user, apps, props.boardId, presences]
  );

  return <AlfredComponent onAction={alfredAction} />;
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type AlfredUIProps = {
  onAction: (command: string) => void;
};

/**
 * React component to get and display the asset list
 */
function AlfredUI({ onAction }: AlfredUIProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = React.useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState<string>();
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'alfred' });

  useHotkeys('cmd+k,ctrl+k', (ke: KeyboardEvent, he: HotkeysEvent): void | boolean => {
    // Open the window
    onOpen();
    // Returning false stops the event and prevents default browser events
    return false;
  });

  // Select the file when clicked
  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const val = event.currentTarget.value;
    if (val) {
      // Set the value, trimming spaces at begining and end
      setTerm(val.trim());
    }
  };

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onClose();
      if (term) {
        onAction(term);
      }
    }
  };
  // Keyboard handler: press enter to activate command
  const onButton = (e: React.MouseEvent) => {
    onClose();
    const text = e.currentTarget.textContent || '';
    onAction('app ' + text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered initialFocusRef={initialRef} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent h={'265px'}>
        {/* Search box */}
        <InputGroup>
          <Input
            ref={initialRef}
            placeholder="Command..."
            _placeholder={{ opacity: 1, color: 'gray.600' }}
            m={2}
            p={2}
            focusBorderColor="gray.500"
            fontSize="xl"
            onChange={handleChange}
            onKeyDown={onSubmit}
          />
        </InputGroup>
        <VStack m={1} p={1}>
          {/* <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            SageCell
          </Button>
          <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            Screenshare
          </Button> */}
          <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            Stickie
          </Button>
          <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            Webview
          </Button>
        </VStack>
      </ModalContent>
    </Modal>
  );
}

const AlfredComponent = React.memo(AlfredUI);
