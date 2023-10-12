/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { Box, useColorModeValue, Text, Button, Tooltip, useDisclosure, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';

import { MdCopyAll, MdSend, MdZoomOutMap, MdChat, } from 'react-icons/md';
import { HiOutlineTrash, HiOutlineSaveAs, HiOutlineStop } from 'react-icons/hi';
import { FaPython } from 'react-icons/fa';

import {
  ConfirmModal, useAbility, useAppStore, useBoardStore, useHexColor,
  useThrottleApps, useUIStore, setupApp, useCursorBoardPosition,
} from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';

/**
 * Lasso Toolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function LassoToolbar() {
  const { roomId, boardId } = useParams();

  // App Store
  const apps = useThrottleApps(250);
  const deleteApp = useAppStore((state) => state.delete);
  const duplicate = useAppStore((state) => state.duplicateApps);
  const createApp = useAppStore((state) => state.create);

  // UI Store
  const lassoApps = useUIStore((state) => state.selectedAppsIds);
  const fitApps = useUIStore((state) => state.fitApps);
  const [showLasso, setShowLasso] = useState(lassoApps.length > 0);

  // Save/clear the app selection
  const setSavedSelectedAppsIds = useUIStore((state) => state.setSavedSelectedAppsIds);
  const clearSavedSelectedAppsIds = useUIStore((state) => state.clearSavedSelectedAppsIds);

  // Position
  const { boardCursor } = useCursorBoardPosition();

  // Boards
  const boards = useBoardStore((state) => state.boards);

  useEffect(() => {
    setShowLasso(lassoApps.length > 0);
    // selectedAppFunctions();
  }, [lassoApps]);

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.500');

  // Modal disclosure for the Close selected apps
  const { isOpen: deleteIsOpen, onClose: deleteOnClose, onOpen: deleteOnOpen } = useDisclosure();

  // Abiities
  const canDeleteApp = useAbility('delete', 'apps');
  const canDuplicateApp = useAbility('create', 'apps');

  // Close all the selected apps
  const closeSelectedApps = () => {
    deleteApp(lassoApps);
    deleteOnClose();
    setShowLasso(false);
  };

  // Zoom the user's view to fit all the selected apps
  const fitSelectedApps = () => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    fitApps(selectedApps);
  };

  // This function will check if the selected apps are all of the same type
  // Then, it will check if that type has a GroupedToolbarComponent to display
  const selectedAppFunctions = (): JSX.Element | null => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));

    // Check if all of same type
    let isAllOfSameType = selectedApps.every((element) => element.data.type === selectedApps[0].data.type);

    let component = null;

    // If they are all of same type
    if (isAllOfSameType) {
      const firstApp = selectedApps[0];
      // Check if that type has a GroupedToolbarComponent
      if (firstApp && firstApp.data.type in Applications) {
        const Component = Applications[firstApp.data.type].GroupedToolbarComponent;
        if (Component) component = <Component key={firstApp._id} apps={selectedApps}></Component>;
      }
    }
    // Return the component
    return component;
  };

  const openInChat = () => {
    const x = boardCursor.x - 200;
    const y = boardCursor.y - 700;
    if (roomId && boardId) {
      // Check if all of same type
      const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
      let isAllOfSameType = selectedApps.every((element) => element.data.type === selectedApps[0].data.type);
      let context = '';
      if (isAllOfSameType) {
        if (selectedApps[0].data.type === 'Stickie') {
          context = selectedApps.reduce((acc, el) => { acc += el.data.state.text + '\n'; return acc; }, '');
          console.log('All', context);
        }
      }
      createApp(setupApp('Chat', 'Chat', x, y, roomId, boardId, { w: 800, h: 420 }, { context: context }));
    }
  };

  const openInCell = () => {
    const x = boardCursor.x - 200;
    const y = boardCursor.y - 1000;
    if (roomId && boardId) {
      let code = '';
      // Check if all of same type
      const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
      let isAllOfSameType = selectedApps.every((element) => element.data.type === selectedApps[0].data.type);
      if (isAllOfSameType && selectedApps[0].data.type === 'CSVViewer') {
        code = `# Load all the CSV files
import pandas as pd
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3
room_id = %%room_id
board_id = %%board_id
app_id = %%app_id
selected_apps = %%selected_apps
ps3 = PySage3(conf, prod_type)
smartbits = ps3.get_smartbits(room_id, board_id)
cell = smartbits[app_id]
bits = [smartbits[a] for a in selected_apps]
for b in bits:
    url = ps3.get_public_url(b.state.assetid)
    frame = pd.read_csv(url)
    print(frame)`;
      } else {
        code = `# Setup SAGE3 API
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3
room_id = %%room_id
board_id = %%board_id
app_id = %%app_id
selected_apps = %%selected_apps
ps3 = PySage3(conf, prod_type)
smartbits = ps3.get_smartbits(room_id, board_id)
cell = smartbits[app_id]
bits = [smartbits[a] for a in selected_apps]
for b in bits:
    print(b)`;
      }
      createApp(setupApp('SageCell', 'SageCell', x, y, roomId, boardId, { w: 960, h: 860 }, { fontSize: 24, code }));
      // Save the selection
      setSavedSelectedAppsIds();
    }
  };

  return (
    <>
      {showLasso && (
        <Box
          transform={`translateX(-50%)`}
          position="absolute"
          left="50vw"
          bottom="6px"
          border="solid 3px"
          borderColor={borderColor}
          bg={panelBackground}
          p="2"
          rounded="md"
          zIndex={1410} // above the drawer but with tooltips
        >
          <Box display="flex" flexDirection="column">
            <Text
              w="100%"
              textAlign="left"
              mx={1}
              color={textColor}
              fontSize={12}
              fontWeight="bold"
              h={'auto'}
              userSelect={'none'}
              className="handle"
            >
              {'Actions'}
            </Text>
            <Box alignItems="center" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
              {/* Show the GroupedToolberComponent here */}
              {selectedAppFunctions()}

              <Tooltip placement="top" hasArrow={true} label={'Zoom to selected Apps'} openDelay={400}>
                <Button onClick={fitSelectedApps} size="xs" p="0" mr="2px" colorScheme={'teal'}>
                  <MdZoomOutMap />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Duplicate Apps'} openDelay={400}>
                <Button onClick={() => duplicate(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'} isDisabled={!canDuplicateApp}>
                  <MdCopyAll />
                </Button>
              </Tooltip>

              <Menu preventOverflow={false} placement={'top'}>
                <Tooltip placement="top" hasArrow={true} label={'Duplicate Apps to a different Board'} openDelay={400}>
                  <MenuButton mx="2px" size={'xs'} as={Button} colorScheme={'teal'} isDisabled={!canDuplicateApp}>
                    <MdSend />
                  </MenuButton>
                </Tooltip>
                <MenuList>
                  {boards.map((b) => {
                    return (
                      <MenuItem key={b._id} onClick={() => duplicate(lassoApps, b)}>
                        {b.data.name}
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </Menu>

              <Tooltip placement="top" hasArrow={true} label={'Save the app selection'} openDelay={400}>
                <Button onClick={setSavedSelectedAppsIds} size="xs" p="0" mx="2px" colorScheme={'yellow'} isDisabled={!canDeleteApp}>
                  <HiOutlineSaveAs size="18px" />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Clear the app selection'} openDelay={400}>
                <Button onClick={clearSavedSelectedAppsIds} size="xs" p="0" mx="2px" colorScheme={'yellow'} isDisabled={!canDeleteApp}>
                  <HiOutlineStop size="18px" />
                </Button>
              </Tooltip>

              <Tooltip placement="top" hasArrow={true} label={'Open in Chat'} openDelay={400}>
                <Button onClick={openInChat} size="xs" p="0" mx="2px" colorScheme={'yellow'} isDisabled={!canDeleteApp}>
                  <MdChat size="18px" />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Open in SageCell'} openDelay={400}>
                <Button onClick={openInCell} size="xs" p="0" mx="2px" colorScheme={'yellow'} isDisabled={!canDeleteApp}>
                  <FaPython size="18px" />
                </Button>
              </Tooltip>

              <Tooltip placement="top" hasArrow={true} label={'Close the selected Apps'} openDelay={400}>
                <Button onClick={deleteOnOpen} size="xs" p="0" mx="2px" colorScheme={'red'} isDisabled={!canDeleteApp}>
                  <HiOutlineTrash size="18px" />
                </Button>
              </Tooltip>

            </Box>
          </Box>
        </Box>
      )}

      <ConfirmModal
        isOpen={deleteIsOpen}
        onClose={deleteOnClose}
        onConfirm={closeSelectedApps}
        title="Close Selected Apps"
        message={`Are you sure you want to close the selected ${lassoApps.length > 1 ? `${lassoApps.length} apps?` : 'app?'} `}
        cancelText="Cancel"
        confirmText="Yes"
        confirmColor="teal"
      ></ConfirmModal>
    </>
  );
}
