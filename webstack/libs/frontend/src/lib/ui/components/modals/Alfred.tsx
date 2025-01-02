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
  Modal,
  ModalOverlay,
  ModalContent,
  InputGroup,
  Input,
  VStack,
  Button,
  useColorMode,
  HStack,
  ListItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  UnorderedList,
  useToast,
  InputLeftAddon,
  useColorModeValue,
} from '@chakra-ui/react';

// Icons for file types
import { IoSparklesSharp } from 'react-icons/io5';
import {
  MdOutlinePictureAsPdf,
  MdOutlineImage,
  MdOutlineFilePresent,
  MdOndemandVideo,
  MdOutlineStickyNote2,
  MdInfoOutline,
} from 'react-icons/md';
import { v5 as uuidv5 } from 'uuid';

import {
  processContentURL,
  useAppStore,
  useUIStore,
  useUser,
  useCursorBoardPosition,
  useAssetStore,
  useUsersStore,
  useConfigStore,
  useThrottleApps,
  useInsightStore,
  setupAppForFile,
  downloadFile,
  apiUrls,
  useUserSettings,
} from '@sage3/frontend';

import { AppName, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { Applications } from '@sage3/applications/apps';
import { getExtension } from '@sage3/shared';
import { FileEntry } from '@sage3/shared/types';

type props = {
  boardId: string;
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
};

const MaxElements = 12;

export function Alfred(props: props) {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  // User Settings
  const { toggleShowUI } = useUserSettings();

  // chakra color mode
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  // Apps
  const apps = useThrottleApps(250);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);
  const setSelectedApps = useUIStore((state) => state.setSelectedAppsIds);
  const fitApps = useUIStore((state) => state.fitApps);

  // User
  const { user, accessId } = useUser();
  const { boardCursor } = useCursorBoardPosition();
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (user) {
      // User name
      const u = user.data.name;
      const firstName = u.split(' ')[0];
      setUsername(firstName);
    }
  }, [user]);

  // Function to create a new app
  const newApplication = (appName: AppName) => {
    if (!user) return;

    let w = 400;
    let h = 400;

    const state = {} as AppState;
    // Check if the app is enabled in the config
    if (appName === 'SageCell' && config.features && !config.features.apps.includes('SageCell')) return;
    if (appName === 'Screenshare' && config.features && !config.features.apps.includes('Screenshare')) {
      return;
    } else {
      w = 1280;
      h = 720;
      state.accessId = accessId;
    }
    if (appName === 'Calculator') {
      w = 260;
      h = 369;
    }
    // Get around  the center of the board
    const bx = useUIStore.getState().boardPosition.x;
    const by = useUIStore.getState().boardPosition.y;
    const scale = useUIStore.getState().scale;
    const x = Math.floor(-bx + window.innerWidth / scale / 2);
    const y = Math.floor(-by + window.innerHeight / scale / 2);

    createApp({
      title: appName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x: x - 200, y: y - 200, z: 0 },
      size: { width: w, height: h, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as AppState), ...state },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  const saveBoard = (name: string) => {
    const selectedapps = useUIStore.getState().savedSelectedAppsIds;
    // Use selected apps if any or all apps
    const apps =
      selectedapps.length > 0 ? useAppStore.getState().apps.filter((a) => selectedapps.includes(a._id)) : useAppStore.getState().apps;
    let filename = name || 'board.s3json';
    if (!filename.endsWith('.s3json')) filename += '.s3json';
    const namespace = useConfigStore.getState().config.namespace;
    const assets = apps.reduce<{ id: string; url: string; filename: string }[]>(function (arr, app) {
      if (app.data.state.assetid) {
        // Generate a public URL of the file
        const token = uuidv5(app.data.state.assetid, namespace);
        const publicURL = apiUrls.assets.getPublicURL(app.data.state.assetid, token);
        const asset = useAssetStore.getState().assets.find((a) => a._id === app.data.state.assetid);
        if (asset) {
          arr.push({ id: app.data.state.assetid, url: window.location.origin + publicURL, filename: asset.data.originalfilename });
        }
      }
      return arr;
    }, []);
    // Data structure to save
    const savedapps = apps.map((app) => {
      // making sure apps have the right state
      return { ...app, data: { ...app.data, state: { ...initialValues[app.data.type], ...app.data.state } } };
    });
    const session = {
      assets: assets,
      apps: savedapps, // apps,
    };
    const payload = JSON.stringify(session, null, 2);
    const jsonurl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(payload);
    // Trigger the download
    downloadFile(jsonurl, filename);
    // Success message
    toast({
      title: 'Board saved',
      description: apps.length + ' apps saved to ' + filename,
      status: 'info',
      duration: 4000,
      isClosable: true,
    });
  };

  // Alfred quick bar response
  const alfredAction = useCallback(
    (term: string) => {
      if (!user) return;

      // Get the position of the cursor
      const cursor = { ...boardCursor, z: 0 };
      const pos = cursor || { x: 100, y: 100, z: 0 };
      const width = 400;
      const height = 420;
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
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'WebpageLink',
            state: { ...initialValues['WebpageLink'], url: processContentURL(loc) },
            raised: true,
            dragging: false,
            pinned: false,
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
          size: { width: 400, height: 400, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'WebpageLink',
          state: { ...initialValues['WebpageLink'], url: processContentURL(searchURL) },
          raised: true,
          dragging: false,
          pinned: false,
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
          dragging: false,
          pinned: false,
        });
      } else if (terms[0] === 'calc' || terms[0] === 'calculator') {
        newApplication('Calculator');
      } else if (terms[0] === 'c' || terms[0] === 'cell') {
        newApplication('SageCell');
      } else if (terms[0] === 'toggleui') {
        toggleShowUI();
      } else if (terms[0] === 'light') {
        if (colorMode !== 'light') toggleColorMode();
      } else if (terms[0] === 'dark') {
        if (colorMode !== 'dark') toggleColorMode();
      } else if (terms[0] === 'save') {
        saveBoard(terms[1]);
      } else if (terms[0] === 'tag') {
        // search apps with tags
        const tags = terms.slice(1);
        const tag = tags[0];
        if (tag) {
          const toSelect: string[] = [];
          useInsightStore.getState().insights.forEach((insight) => {
            if (insight.data.labels && insight.data.labels.includes(tag)) {
              toSelect.push(insight.data.app_id);
            }
          });
          if (toSelect.length > 0) {
            setSelectedApps(toSelect);
            fitApps(apps.filter((a) => toSelect.includes(a._id)));
          }
        }
      } else if (terms[0] === 'clear' || terms[0] === 'clearall' || terms[0] === 'closeall') {
        // Batch delete all the apps
        const ids = apps.map((a) => a._id);
        deleteApp(ids);
      } else {
        // redo the calculations for the position
        const ww = 820;
        const hh = 620;
        // Get around  the center of the board
        const bx = useUIStore.getState().boardPosition.x;
        const by = useUIStore.getState().boardPosition.y;
        const scale = useUIStore.getState().scale;
        let px = Math.floor(-bx + window.innerWidth / scale / 2); // center
        let py = Math.floor(-by + window.innerHeight / scale / 3); // 1/3 down
        px -= ww / 2;
        py -= hh / 2;

        // Build the question
        const question = {
          id: 'starting',
          creationId: 'starting',
          creationDate: Date.now(),
          userName: '',
          query: '',
          response: 'I am SAGE AI! Ask me anything by directing the question to me (@S), or chat with people in the board',
          userId: '',
        };

        // Send the text to chat
        createApp({
          title: 'AI Chat',
          roomId: props.roomId,
          boardId: props.boardId,
          position: { x: px, y: py, z: 0 },
          size: { width: ww, height: hh, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Chat',
          state: {
            ...(initialValues['Stickie'] as AppState),
            firstQuestion: term,
            messages: [question],
            previousQ: '',
            previousA: '',
            context: '',
            token: '',
            sources: [],
          },
          raised: true,
          dragging: false,
          pinned: false,
        });
      }
    },
    [user, apps, props.boardId, boardCursor, colorMode]
  );

  return (
    <AlfredComponent onAction={alfredAction} roomId={props.roomId} boardId={props.boardId} isOpen={props.isOpen} onClose={props.onClose} />
  );
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type AlfredUIProps = {
  onAction: (command: string) => void;
  roomId: string;
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * React component to get and display the asset list
 */
function AlfredUI(props: AlfredUIProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);
  // List of elements
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<string>();

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
  const [listIndex, setListIndex] = useState(0);
  const [buttonList, setButtonList] = useState<JSX.Element[]>([]);
  // colors
  const intelligenceColor = useColorModeValue('purple.500', 'purple.400');

  // Select the file when clicked
  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const val = event.currentTarget.value;
    if (val) {
      // Set the value, trimming spaces at begining and end
      setTerm(val.trim());
    } else {
      setTerm('');
      setListIndex(0);
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
      setListIndex(0);
    }
  }, [term, assetsList]);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      props.onClose();
      if (listIndex > 0) {
        const elt = filteredList[listIndex - 1];
        if (elt) openFile(elt.id);
      } else {
        if (term) {
          props.onAction(term);
        }
      }
    } else if (e.key === 'ArrowDown') {
      setListIndex((prev) => {
        const limit = Math.min(MaxElements, filteredList.length);
        const newVal = prev + 1 >= limit ? limit : prev + 1;
        if (newVal >= 0 && newVal < limit) {
          // Scroll the list to the selected element
          listRef.current?.children[newVal].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'center' });
        }
        return newVal;
      });
    } else if (e.key === 'ArrowUp') {
      setListIndex((prev) => {
        const limit = Math.min(MaxElements, filteredList.length);
        const newVal = prev - 1 < 0 ? 0 : prev - 1;
        if (newVal >= 0 && newVal < limit) {
          // Scroll the list to the selected element
          listRef.current?.children[newVal].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'center' });
        }
        return newVal;
      });
    }
  };

  useEffect(() => {
    // Filter the asset keys for this room
    const filterbyRoom = assets.filter((k) => k.data.room === props.roomId && k.data.owner === user?._id);
    // Create entries
    const newList = filterbyRoom
      .map((item) => {
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
      })
      .sort((a, b) => {
        // compare dates (number)
        return b.dateAdded - a.dateAdded;
      });
    setAssetsList(newList);
  }, [assets, props.roomId, user]);

  // Open the file
  const openFile = async (id: string) => {
    props.onClose();
    if (!user) return;
    // Create the app
    const file = assetsList.find((a) => a.id === id);
    if (file) {
      // Get around  the center of the board
      const bx = useUIStore.getState().boardPosition.x;
      const by = useUIStore.getState().boardPosition.y;
      const scale = useUIStore.getState().scale;
      const x = Math.floor(-bx + window.innerWidth / scale / 2);
      const y = Math.floor(-by + window.innerHeight / scale / 2);
      // Create the app
      const setup = await setupAppForFile(file, x, y, props.roomId, props.boardId, user);
      if (setup) createApp(setup);
    }
  };

  useEffect(() => {
    // Build the list of actions
    const actions = filteredList.map((a, idx) => {
      const extension = getExtension(a.type);
      return {
        id: a.id,
        filename: a.originalfilename,
        icon: whichIcon(extension),
        selected: idx === listIndex - 1,
      };
    });
    // Build the list of buttons
    const buttons = actions.slice(0, MaxElements).map((b, i) => (
      <Button
        key={b.id}
        m={'1px 4px 1px 1px'}
        p={2}
        minHeight={'36px'}
        width={'99%'}
        leftIcon={b.icon}
        fontSize="md"
        justifyContent="flex-start"
        variant="outline"
        backgroundColor={b.selected ? 'blue.500' : ''}
        _hover={{ backgroundColor: 'blue.500' }}
        onMouseEnter={() => setListIndex(i + 1)}
        onMouseLeave={() => setListIndex(0)}
        onClick={() => openFile(b.id)}
      >
        {b.filename}
      </Button>
    ));
    setButtonList(buttons);
  }, [filteredList, listIndex]);

  useEffect(() => {
    if (filteredList.length === 0) {
      setListIndex(0);
    }
  }, [filteredList]);

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="xl"
      initialFocusRef={initialRef}
      blockScrollOnMount={false}
      scrollBehavior={'inside'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent maxH={'30vh'} top={'4rem'}>
        <HStack>
          {/* Search box */}
          <InputGroup>
            <InputLeftAddon p={2} m={'8px 0px 8px 8px'} backgroundColor={intelligenceColor}>
              <IoSparklesSharp size="22px" color={'white'} />{' '}
            </InputLeftAddon>
            <Input
              ref={initialRef}
              placeholder="Asset, Command, or ask SAGE Intellingence"
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              p={2}
              m={'8px 0px 8px 0px'}
              focusBorderColor="gray.500"
              _focusVisible={{ borderColor: 'gray.500' }}
              boxSizing="border-box"
              fontSize="xl"
              onChange={handleChange}
              onKeyDown={onSubmit}
            />
          </InputGroup>

          {/* Help box */}
          <Popover trigger="hover">
            <PopoverTrigger>
              <Button p={0} m={'8px 8px 8px 0px'}>
                <MdInfoOutline fontSize={'18px'} />
              </Button>
            </PopoverTrigger>
            <PopoverContent fontSize={'sm'} width={'300px'}>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>Quick Actions</PopoverHeader>
              <PopoverBody>
                <UnorderedList>
                  <ListItem>Select an asset to open it (click/enter)</ListItem>
                  <ListItem>
                    <b>app</b> [name]: Create an application
                  </ListItem>
                  <ListItem>
                    <b>w</b> [url]: Open URL in a webview
                  </ListItem>
                  <ListItem>
                    <b>g</b> [term]: Google search
                  </ListItem>
                  <ListItem>
                    <b>s</b> [text]: Stickie with text
                  </ListItem>
                  <ListItem>
                    <b>c</b> : Create a SageCell
                  </ListItem>
                  <ListItem>
                    <b>showui</b> : Show the panels
                  </ListItem>
                  <ListItem>
                    <b>hideui</b> : Hide the panels
                  </ListItem>
                  <ListItem>
                    <b>light</b> : Switch to light mode
                  </ListItem>
                  <ListItem>
                    <b>calc</b> : Open the calculator app
                  </ListItem>
                  <ListItem>
                    <b>dark</b> : Switch to dark mode
                  </ListItem>
                  <ListItem>
                    <b>tag</b> : Search applications with tags
                  </ListItem>
                  <ListItem>
                    <b>save</b> [filename]: Save the board to a file
                  </ListItem>
                  <ListItem>
                    <b>clear</b> : Close all applications
                  </ListItem>
                </UnorderedList>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </HStack>
        <VStack m={'0px 4px 4px 6px'} p={0} overflowY={'auto'} overflowX={'clip'} ref={listRef} spacing={1}>
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
