/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import {
  Box,
  useColorModeValue,
  Text,
  Button,
  Tooltip,
  useDisclosure,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuGroup,
  MenuDivider,
} from '@chakra-ui/react';

import potpack from 'potpack';
import { Box as Rectangle, Point, Polygon, BooleanOperations, Relations } from '@flatten-js/core';

import { MdCopyAll, MdSend, MdZoomOutMap, MdChat, MdMenu, MdPinDrop, MdAutoAwesomeMosaic, MdAutoAwesomeMotion } from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';
import { FaPython } from 'react-icons/fa';

import {
  ConfirmModal,
  useAbility,
  useAppStore,
  useBoardStore,
  useHexColor,
  useThrottleApps,
  useUIStore,
  setupApp,
  useCursorBoardPosition,
} from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { AppSchema } from '@sage3/applications/schema';
import { Board } from '@sage3/shared/types';

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
  const update = useAppStore((state) => state.update);
  const updateBatch = useAppStore((state) => state.updateBatch);

  // UI Store
  const lassoApps = useUIStore((state) => state.selectedAppsIds);
  const fitApps = useUIStore((state) => state.fitApps);
  const [showLasso, setShowLasso] = useState(lassoApps.length > 0);

  // Position
  const { boardCursor } = useCursorBoardPosition();

  // Boards
  const boards = useBoardStore((state) => state.boards);
  const roomsBoards = boards.filter((b) => b.data.roomId === roomId);

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.500');

  // Modal disclosure for the Close selected apps
  const { isOpen: deleteIsOpen, onClose: deleteOnClose, onOpen: deleteOnOpen } = useDisclosure();

  // Abiities
  const canDeleteApp = useAbility('delete', 'apps');
  const canCreateApp = useAbility('create', 'apps');
  const canPin = useAbility('pin', 'apps');

  // Submenu for duplicating to another board
  const hoverColorMode = useColorModeValue('gray.100', 'whiteAlpha.100');
  const hoverColor = useHexColor(hoverColorMode);
  const [sendToBoardSubmenuOpen, setSendToBoardSubmenuOpen] = useState<boolean>(false);
  const openSendToBoardSubmenu = () => {
    if (!sendToBoardSubmenuOpen) setSendToBoardSubmenuOpen(true);
  };
  const closeSendToBoardSubmenu = () => {
    if (sendToBoardSubmenuOpen) setSendToBoardSubmenuOpen(false);
  };
  const toggleSendToBoardSubmenu = () => {
    setSendToBoardSubmenuOpen(!sendToBoardSubmenuOpen);
  };

  useEffect(() => {
    setShowLasso(lassoApps.length > 0);
    // selectedAppFunctions();
  }, [lassoApps]);

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

  // Pin/Unpin all the selected apps
  const pin = () => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    if (selectedApps.length > 0) {
      // use the first app to determine the state of the rest
      const pinned = selectedApps[0].data.pinned;
      // Array of update to batch at once
      const ps: Array<{ id: string; updates: Partial<AppSchema> }> = [];
      selectedApps.forEach((el) => {
        ps.push({ id: el._id, updates: { pinned: !pinned } });
        // updateS!pinned;
      });
      // Update all the apps at once
      updateBatch(ps);
    }
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

  // Duplicate all the selected apps
  const handleDuplicateApps = () => {
    duplicate(lassoApps);
  };

  // Duplicate all the selected apps to a different board
  const duplicateToBoard = (board: Board) => {
    duplicate(lassoApps, board);
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
          context = selectedApps.reduce((acc, el) => {
            acc += el.data.state.text + '\n';
            return acc;
          }, '');
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
room_id = %%sage_room_id
board_id = %%sage_board_id
app_id = %%sage_app_id
selected_apps = %%sage_selected_apps
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
room_id = %%sage_room_id
board_id = %%sage_board_id
app_id = %%sage_app_id
selected_apps = %%sage_selected_apps
ps3 = PySage3(conf, prod_type)
smartbits = ps3.get_smartbits(room_id, board_id)
cell = smartbits[app_id]
bits = [smartbits[a] for a in selected_apps]
for b in bits:
    print(b)`;
      }
      createApp(setupApp('SageCell', 'SageCell', x, y, roomId, boardId, { w: 960, h: 860 }, { fontSize: 24, code }));
    }
  };

  // Calculate a new layout for the selected apps
  const autoLayout_pack = () => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    const boxes = selectedApps.map((el) => {
      return {
        app: el,
        bbox: [el.data.position.x, el.data.position.y, el.data.position.x + el.data.size.width, el.data.position.y + el.data.size.height],
        area: el.data.size.width * el.data.size.height,
      }
    });
    console.log('Auto Layout', selectedApps);
    // sort by size
    boxes.sort((a, b) => b.area - a.area);
    console.log('Boxes', boxes);

    const padding = 30;
    // calculate the center of the bounding boxes
    const minx = Math.min(...boxes.map((el) => el.bbox[0]));
    const maxx = Math.max(...boxes.map((el) => el.bbox[2]));
    const miny = Math.min(...boxes.map((el) => el.bbox[1]));
    const maxy = Math.max(...boxes.map((el) => el.bbox[3]));
    const center = [padding / 2 + (minx + maxx) / 2, padding / 2 + (miny + maxy) / 2];
    console.log('Center', center);

    const data = boxes.map((el) => ({
      w: el.app.data.size.width + padding, h: el.app.data.size.height + padding,
      id: el.app._id, x: 0, y: 0
    }));

    const { w, h, fill } = potpack(data);
    data.forEach((el) => {
      const app = apps.find((a) => a._id === el.id);
      const x = center[0] + el.x - w / 2;
      const y = center[1] + el.y - h / 2;
      if (app) update(app._id, { position: { ...app.data.position, x, y } });
    });
  };

  // Calculate a new layout for the selected apps
  const autoLayout_nice = () => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    const boxes = selectedApps.map((el) => {
      return {
        app: el,
        bbox: [el.data.position.x, el.data.position.y, el.data.position.x + el.data.size.width, el.data.position.y + el.data.size.height],
        area: el.data.size.width * el.data.size.height,
      }
    });
    console.log('Auto Layout', selectedApps);
    // sort by size
    boxes.sort((a, b) => b.area - a.area);
    console.log('Boxes', boxes);

    // calculate the center of the bounding boxes
    const minx = Math.min(...boxes.map((el) => el.bbox[0]));
    const maxx = Math.max(...boxes.map((el) => el.bbox[2]));
    const miny = Math.min(...boxes.map((el) => el.bbox[1]));
    const maxy = Math.max(...boxes.map((el) => el.bbox[3]));
    const center = [(minx + maxx) / 2, (miny + maxy) / 2];
    console.log('Center', center);

    // move the big one to the center
    const big = boxes[0].app;

    const newpos = { x: center[0] - big.data.size.width / 2, y: center[1] - big.data.size.height / 2 };
    update(big._id, { position: { ...big.data.position, ...newpos } });

    const shape1 = new Rectangle(
      newpos.x,
      newpos.y,
      newpos.x + big.data.size.width,
      newpos.y + big.data.size.height);

    // move a second one to the right and with an offset down
    const secondpos = {
      x: center[0] + big.data.size.width / 2,
      y: center[1] - big.data.size.height / 2 + (big.data.size.height / 3),
    };
    const second = boxes[1].app;
    update(second._id, { position: { ...second.data.position, ...secondpos } });
    const shape2 = new Rectangle(
      secondpos.x,
      secondpos.y,
      secondpos.x + second.data.size.width,
      secondpos.y + second.data.size.height);

    const p1 = new Polygon(shape1.toPoints());
    console.log("🚀 ~ file: LassoToolbar.tsx:261 ~ LassoToolbar ~ p1:", shape1.toPoints(), p1.edges);

    const union = BooleanOperations.unify(new Polygon(shape1.toPoints()), new Polygon(shape2.toPoints()));
    const vs = union.vertices;
    const res = vs.map((p, i) => ({ idx: i, d: p.distanceTo(new Point(center[0], center[1]))[0] }));
    res.sort((a, b) => a.d - b.d);
    const p = vs[res[0].idx];
    console.log("🚀 ~ file: LassoToolbar.tsx:264 ~ LassoToolbar ~ res:", p)

    const third = boxes[2].app;

    const padding = 30;
    let done = false;

    // Q1: up right
    let px = p.x;
    let py = p.y - third.data.size.height;
    const shape3a = new Rectangle(
      px + padding, py - padding,
      px + padding + third.data.size.width,
      py - padding + third.data.size.height);
    let isTouching = Relations.touch(union, shape3a) || Relations.intersect(union, shape3a);
    console.log("🚀 ~ file: LassoToolbar.tsx:272 ~ LassoToolbar ~ isTouching:", isTouching);
    console.log(union.svg(), shape3a.svg());
    if (!isTouching && !done) {
      done = true;
      update(third._id, { position: { ...third.data.position, x: px, y: py } });
    }

    // Q2: down right
    px = p.x;
    py = p.y;
    const shape3b = new Rectangle(
      px + padding, py + padding,
      px + padding + third.data.size.width,
      py + padding + third.data.size.height);
    isTouching = Relations.touch(union, shape3b) || Relations.intersect(union, shape3b);
    console.log("🚀 ~ file: LassoToolbar.tsx:289 ~ LassoToolbar ~ isTouching:", isTouching)
    console.log(union.svg(), shape3b.svg());
    if (!isTouching && !done) {
      done = true;
      update(third._id, { position: { ...third.data.position, x: px, y: py } });
    }
    const union1 = BooleanOperations.unify(union, new Polygon(shape3b.toPoints()));

    // Q3: up left
    px = p.x - third.data.size.width;
    py = p.y - third.data.size.height;
    const shape3c = new Rectangle(
      px - padding, py - padding,
      px - padding + third.data.size.width,
      py - padding + third.data.size.height);
    isTouching = Relations.touch(union, shape3c) || Relations.intersect(union, shape3c);
    console.log(union.svg(), shape3c.svg());
    console.log("🚀 ~ file: LassoToolbar.tsx:272 ~ LassoToolbar ~ isTouching:", isTouching)
    if (!isTouching && !done) {
      done = true;
      update(third._id, { position: { ...third.data.position, x: px, y: py } });
    }

    // Q4: down left
    px = p.x - third.data.size.width;
    py = p.y;
    const shape3d = new Rectangle(
      px - padding, py + padding,
      px - padding + third.data.size.width,
      py + padding + third.data.size.height);
    isTouching = Relations.touch(union, shape3d) || Relations.intersect(union, shape3d);
    console.log(union.svg(), shape3d.svg());
    console.log("🚀 ~ file: LassoToolbar.tsx:272 ~ LassoToolbar ~ isTouching:", isTouching)
    if (!isTouching && !done) {
      done = true;
      update(third._id, { position: { ...third.data.position, x: px, y: py } });
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
            <Box alignItems="center" p="0" m="0" width="100%" display="flex" height="32px" userSelect={'none'}>
              {/* Show the GroupedToolberComponent here */}
              {selectedAppFunctions()}

              <Menu>
                <MenuButton size="xs" as={Button} mr={'2px'} colorScheme="yellow">
                  <MdMenu />
                </MenuButton>
                <MenuList p="0" m="0">
                  <MenuGroup title="Actions" m="1">
                    <MenuItem onClick={fitSelectedApps} icon={<MdZoomOutMap />} py="0" m="0">
                      Zoom To Apps
                    </MenuItem>
                    <MenuItem isDisabled={!canPin} onClick={pin} icon={<MdPinDrop />} py="0" m="0">
                      Pin Apps
                    </MenuItem>
                    <MenuItem isDisabled={!canCreateApp} onClick={handleDuplicateApps} icon={<MdCopyAll />} py="0" m="0">
                      Duplicate Apps
                    </MenuItem>
                    {/* Submenu */}
                    <Menu isOpen={sendToBoardSubmenuOpen} placement="right-end" onClose={closeSendToBoardSubmenu}>
                      <MenuButton
                        as={MenuItem} py="0" m="0"
                        isDisabled={!canCreateApp}
                        onClick={toggleSendToBoardSubmenu}
                        icon={<MdSend />}
                        _hover={{ backgroundColor: hoverColor }}
                      >
                        Duplicate to another Board
                      </MenuButton>
                      <MenuList>
                        {roomsBoards.map((b) => {
                          return (
                            <MenuItem key={b._id} onClick={() => duplicate(lassoApps, b)} py="0" m="0">
                              {b.data.name}
                            </MenuItem>
                          );
                        })}
                      </MenuList>
                    </Menu>
                  </MenuGroup>
                  <MenuDivider />
                  <MenuGroup title="AI Actions" m="1">
                    <MenuItem isDisabled={!canCreateApp} onClick={openInCell} icon={<FaPython />} py="0" m="0">
                      Open in SAGECell
                    </MenuItem>
                    <MenuItem isDisabled={!canCreateApp} onClick={openInChat} icon={<MdChat />} py="0" m="0">
                      Open in Chat
                    </MenuItem>
                  </MenuGroup>
                </MenuList>
              </Menu>


              {/* MdAutoAwesomeMosaic, MdAutoAwesomeMotion */}
              <Tooltip placement="top" hasArrow={true} label={'Nice Layout'} openDelay={400}>
                <Button onClick={autoLayout_nice} size="xs" p="0" mx="2px" colorScheme={'yellow'} isDisabled={!canDeleteApp}>
                  <MdAutoAwesomeMosaic size="18px" />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Pack Layout'} openDelay={400}>
                <Button onClick={autoLayout_pack} size="xs" p="0" mx="2px" colorScheme={'yellow'} isDisabled={!canDeleteApp}>
                  <MdAutoAwesomeMotion size="18px" />
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
        </Box >
      )
      }

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
