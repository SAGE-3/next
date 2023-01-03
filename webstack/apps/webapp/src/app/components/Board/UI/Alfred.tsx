/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
// Import Chakra UI elements
import {
  useDisclosure,
  Modal, ModalOverlay, ModalContent,
  InputGroup, Input, VStack, Button,
} from '@chakra-ui/react';

import { MdApps, MdAccountCircle } from 'react-icons/md';

// Icons for file types
import { MdOutlinePictureAsPdf, MdOutlineImage, MdOutlineFilePresent, MdOndemandVideo, MdOutlineStickyNote2 } from 'react-icons/md';

import {
  processContentURL,
  useAppStore,
  useHotkeys, HotkeysEvent,
  usePresenceStore,
  useUIStore,
  useUser,
  useData,
  useCursorBoardPosition,
  useAssetStore,
  useUsersStore,
} from '@sage3/frontend';

import { getExtension } from '@sage3/shared';

import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppState } from '@sage3/applications/schema';
import { Applications } from '@sage3/applications/apps';

import { FileEntry } from './Panels/Asset/types';
import { setupAppForFile } from './Panels/Asset/CreateApp';

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

  return <AlfredComponent onAction={alfredAction} roomId={props.roomId} boardId={props.boardId} />;
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type AlfredUIProps = {
  onAction: (command: string) => void;
  roomId: string;
  boardId: string;
};

/**
 * React component to get and display the asset list
 */
function AlfredUI({ onAction, roomId, boardId }: AlfredUIProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);
  // List of elements
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<string>();
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'alfred' });
  // Apps
  const createApp = useAppStore((state) => state.create);
  // Assets store
  const assets = useAssetStore((state) => state.assets);
  const [assetsList, setAssetsList] = useState<FileEntry[]>([]);
  const [filteredList, setFilteredList] = useState<FileEntry[]>([]);
  // Access the list of users
  const users = useUsersStore((state) => state.users);
  // check if user is a guest
  const { user } = useUser();
  const { position: cursorPosition } = useCursorBoardPosition();
  const [listIndex, setListIndex] = useState(0);

  useHotkeys('cmd+k,ctrl+k', (ke: KeyboardEvent, he: HotkeysEvent): void | boolean => {
    // Open the window
    onOpen();
    setListIndex(0);
    // Clear the search
    setTerm('');
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
    } else {
      setTerm('');
    }
  };

  useEffect(() => {
    if (term) {
      // If something to search
      setFilteredList(
        assetsList.filter((item) => {
          // if term is in the filename
          return (
            // search in the filename
            item.originalfilename.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
            // search in the type
            item.type.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
            // search in the owner name
            item.ownerName.toUpperCase().indexOf(term.toUpperCase()) !== -1
          );
        })
      );
    } else {
      // Full list if no search term
      setFilteredList(assetsList);
    }
  }, [term]);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onClose();
      if (listIndex > 0) {
        const elt = assetsList[listIndex - 1];
        if (elt) openFile(elt.id);
      } else
        if (term) {
          onAction(term);
        }
    } else if (e.key === 'ArrowDown') {
      setListIndex((prev) => prev + 1 >= assetsList.length ? assetsList.length - 1 : prev + 1);
    } else if (e.key === 'ArrowUp') {
      setListIndex((prev) => prev - 1 < 0 ? 0 : prev - 1);
    }
  };

  useEffect(() => {
    if (listIndex >= 0 && listIndex < assetsList.length) {
      listRef.current?.scrollTo({
        top: (listIndex - 1) * 50,
        behavior: 'smooth'
      });
    }
  }, [listIndex]);

  useEffect(() => {
    // Filter the asset keys for this room
    const filterbyRoom = assets.filter((k) => k.data.room === roomId);
    // Create entries
    setAssetsList(
      filterbyRoom.map((item) => {
        // build an FileEntry object
        const entry: FileEntry = {
          id: item._id,
          owner: item.data.owner,
          ownerName: users.find((el) => el._id === item.data.owner)?.data.name || '-',
          filename: item.data.file,
          originalfilename: item.data.originalfilename,
          date: new Date(item.data.dateCreated).getTime(),
          dateAdded: new Date(item.data.dateAdded).getTime(),
          room: item.data.room,
          size: item.data.size,
          type: item.data.mimetype,
          derived: item.data.derived,
          metadata: item.data.metadata,
          selected: false,
        };
        return entry;
      }).sort((a, b) => {
        // compare dates (number)
        return b.dateAdded - a.dateAdded;
      })
    );
  }, [assets, roomId]);

  // Open the file
  const openFile = async (id: string) => {
    onClose();
    if (!user) return;
    // Create the app
    const file = assetsList.find((a) => a.id === id);
    if (file) {
      const setup = await setupAppForFile(file, cursorPosition.x, cursorPosition.y, roomId, boardId, user);
      if (setup) createApp(setup);
    }
  };

  // Build the list of actions
  const actions = filteredList.map((a, idx) => {
    const extension = getExtension(a.type);
    return {
      id: a.id, filename: a.originalfilename, icon: whichIcon(extension),
      selected: idx === (listIndex - 1)
    };
  });

  // Build the list of buttons
  const buttonList = actions.slice(0, 10).map((b, i) => (
    <Button key={b.id} my={1} minHeight={"40px"}
      leftIcon={b.icon} fontSize="lg" justifyContent="flex-start"
      width={'100%'} variant="outline"
      backgroundColor={b.selected ? 'blue.500' : ''}
      _hover={{ backgroundColor: 'blue.500' }}
      onMouseOver={() => setListIndex(i + 1)}
      onMouseLeave={() => setListIndex(0)}
      onClick={() => openFile(b.id)}
    >
      {b.filename}
    </Button>));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered initialFocusRef={initialRef} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent maxH={300}>
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
        <VStack m={1} p={1} overflowY={"scroll"} ref={listRef}>
          {buttonList}
        </VStack>
      </ModalContent>
    </Modal>
  );
}

const AlfredComponent = React.memo(AlfredUI);


/**
 * Pick an icon based on file type (extension string)
 *
 * @param {string} type
 * @returns {JSX.Element}
 */
function whichIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
    case 'jpeg':
      return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
    case 'mp4':
      return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
    case 'json':
      return <MdOutlineStickyNote2 style={{ color: 'darkgray' }} size={'20px'} />;
    default:
      return <MdOutlineFilePresent size={'20px'} />;
  }
}
