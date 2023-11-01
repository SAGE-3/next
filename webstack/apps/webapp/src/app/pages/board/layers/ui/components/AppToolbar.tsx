/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import {
  Input,
  Box,
  useColorModeValue,
  Text,
  Button,
  Tooltip,
  ListItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  UnorderedList,
  useDisclosure,
} from '@chakra-ui/react';
import { MdClose, MdCopyAll, MdInfoOutline, MdZoomOutMap, MdLock, MdLockOpen } from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';

import { formatDistance } from 'date-fns';

import {
  useAbility,
  useAppStore,
  useHexColor,
  useThrottleApps,
  useUIStore,
  useUsersStore,
  useInsightStore,
  ConfirmModal,
} from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';

type AppToolbarProps = {};

/**
 * AppToolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function AppToolbar(props: AppToolbarProps) {
  // App Store
  const apps = useThrottleApps(250);
  const deleteApp = useAppStore((state) => state.delete);
  const duplicate = useAppStore((state) => state.duplicateApps);
  const update = useAppStore((state) => state.update);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);

  const textColor = useColorModeValue('gray.800', 'gray.100');
  const commonButtonColors = useColorModeValue('gray.300', 'gray.200');
  const buttonTextColor = useColorModeValue('white', 'black');
  const selectColor = useHexColor('teal');

  // UI store
  const showUI = useUIStore((state) => state.showUI);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const scale = useUIStore((state) => state.scale);
  const appDragging = useUIStore((state) => state.appDragging);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  // Access the list of users
  const users = useUsersStore((state) => state.users);

  // Position state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const [previousLocation, setPreviousLocation] = useState({ x: 0, y: 0, s: 1, set: false, app: '' });

  // Insight labels
  const [tags, setTags] = useState<string[]>([]);
  // Convert to string for input element
  const [inputLabel, setInputLabel] = useState<string>(tags.join(' '));

  // Apps
  const app = apps.find((app) => app._id === selectedApp);

  // Delete app modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Insight Store
  const insights = useInsightStore((state) => state.insights);
  const updateInsight = useInsightStore((state) => state.update);

  useEffect(() => {
    if (insights && insights.length > 0 && app) {
      // Match the app with the insight
      const insight = insights.find((el) => el._id === app._id);
      if (insight) {
        // if found, update the tags
        setTags(insight.data.labels);
        setInputLabel(insight.data.labels.join(' '));
      }
    }
  }, [app, insights]);

  // Abilities
  const canDeleteApp = useAbility('delete', 'apps');
  const canDuplicateApp = useAbility('create', 'apps');
  const canPin = useAbility('pin', 'apps');

  useLayoutEffect(() => {
    if (app && boxRef.current) {
      // App Pos and Size
      const ax = app.data.position.x * scale;
      const ay = app.data.position.y * scale;
      const ah = app.data.size.height * scale;
      const aw = app.data.size.width * scale;
      const spacing = 32 * scale; // spacing between app and toolbar
      let aby = ay + ah + spacing; // App Bottom Y

      // Board Pos and Size
      const bx = boardPosition.x * scale;
      const by = boardPosition.y * scale;

      // App Position on Window
      const appXWin = bx + ax;
      const appYWin = by + ay;
      const appBYWin = by + aby; // App Bottom Y on Window

      // Toolbar Width
      const tw = boxRef.current.clientWidth + 6; // Toolbar Width + 6px for borders
      const twhalf = tw / 2;
      const toolbarHeight = 82;

      // Window Size
      const wh = window.innerHeight;
      const ww = window.innerWidth;

      function screenLimit(pos: { x: number; y: number }) {
        // Check if toolbar is out of screen
        if (pos.x < 0) {
          pos.x = 0;
        } else if (pos.x + tw > ww) {
          pos.x = ww - tw;
        }
        if (pos.y < 0) {
          pos.y = 0;
        } else if (pos.y + toolbarHeight > wh) {
          pos.y = wh - toolbarHeight;
        }

        return pos;
      }

      // Default Toolbar Poistion. Middle of screen at bottom
      const defaultPosition = screenLimit({ x: ww / 2 - twhalf, y: wh - toolbarHeight });

      // App Bottom Position
      const appBottomPosition = screenLimit({ x: appXWin + aw / 2 - twhalf, y: appBYWin });

      // App Top Position
      const appTopPosition = screenLimit({ x: appXWin + aw / 2 - twhalf, y: appYWin - toolbarHeight });

      // App is taller than window
      if (ah * 1.2 > wh) {
        setPosition(defaultPosition);
        setAppToolbarPosition(defaultPosition); // Update the UI Store
      }
      // App is off screen
      else if (appXWin > ww || appXWin + aw < 0 || appYWin > wh || appYWin + ah < 0) {
        setPosition(defaultPosition);
        setAppToolbarPosition(defaultPosition);
      }
      // App is close to bottom of the screen
      else if (appBYWin + toolbarHeight > wh) {
        setPosition(appTopPosition);
        setAppToolbarPosition(appTopPosition);
      } else {
        setPosition(appBottomPosition);
        setAppToolbarPosition(appBottomPosition);
      }
    }
  }, [app?.data.position, app?.data.size, scale, boardPosition.x, boardPosition.y, window.innerHeight, window.innerWidth]);

  function moveToApp() {
    if (!app) return;
    if (previousLocation.app !== app._id || !previousLocation.set) {
      // Scale
      const aW = app.data.size.width + 60; // Border Buffer
      const aH = app.data.size.height + 100; // Border Buffer
      const wW = window.innerWidth;
      const wH = window.innerHeight;
      const sX = wW / aW;
      const sY = wH / aH;
      const zoom = Math.min(sX, sY);

      // Position
      let aX = -app.data.position.x + 20;
      let aY = -app.data.position.y + 20;
      const w = app.data.size.width;
      const h = app.data.size.height;
      if (sX >= sY) {
        aX = aX - w / 2 + wW / 2 / zoom;
      } else {
        aY = aY - h / 2 + wH / 2 / zoom;
      }
      const x = aX;
      const y = aY;

      setBoardPosition({ x, y });
      setScale(zoom);

      // save the previous location
      setPreviousLocation((prev) => ({ x: boardPosition.x, y: boardPosition.y, s: scale, set: true, app: app._id }));
    } else {
      // if action is pressed again, restore the previous location
      setBoardPosition({ x: previousLocation.x, y: previousLocation.y });
      setScale(previousLocation.s);
      setPreviousLocation((prev) => ({ ...prev, set: false, app: '' }));
    }
  }

  const togglePin = () => {
    if (app) {
      update(app._id, { pinned: !app.data.pinned });
    }
  };

  function getAppToolbar() {
    if (app && Applications[app.data.type]) {
      // Get the component from the app definition
      const Component = Applications[app.data.type].ToolbarComponent;
      // Get some application information
      const ownerName = users.find((el) => el._id === app._createdBy)?.data.name;
      const now = new Date();
      const when = formatDistance(new Date(app._createdAt), now, { addSuffix: true });

      // Input to edit the tags
      const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputLabel(event.target.value);
      };

      // Press Enter to update
      const onSubmit = (event: React.KeyboardEvent<HTMLInputElement>, onClose: () => void) => {
        if (event.key === 'Enter') {
          // cleanup the input
          const clean = inputLabel.replace(/\s+/g, ' ');
          const localTags = clean.split(' ').map((el) => el.trim());
          setInputLabel(localTags.join(' '));
          // Updating the backend
          updateInsight(app._id, { labels: localTags });
          // Close the popover
          onClose();
        }
      };

      return (
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <>
              <Text whiteSpace="nowrap">An error has occured.</Text>
              <Tooltip placement="top" hasArrow={true} label={'Delete App'} openDelay={400} ml="1">
                <Button onClick={() => deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mx="1">
                  <MdClose color={buttonTextColor} />
                </Button>
              </Tooltip>
            </>
          )}
        >
          <>
            <Component key={app._id} {...app}></Component>

            {/* Application Information Popover */}
            <Popover trigger="hover">
              {({ isOpen, onClose }) => (
                <>
                  <PopoverTrigger>
                    <Button backgroundColor={commonButtonColors} size="xs" ml="2" mr="0" p={0}>
                      <MdInfoOutline fontSize={'18px'} color={buttonTextColor} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent fontSize={'sm'} width={'375px'}>
                    <PopoverArrow />
                    <PopoverCloseButton />
                    <PopoverHeader>Application Information</PopoverHeader>
                    <PopoverBody userSelect={"text"}>
                      <UnorderedList>
                        <ListItem><b>ID</b>: {app._id}</ListItem>
                        <ListItem><b>Type</b>: {app.data.type}</ListItem>
                        <ListItem><b>Owner</b>: {ownerName}</ListItem>
                        <ListItem><b>Created</b>: {when}</ListItem>
                        <ListItem whiteSpace={"nowrap"}><b>Tags</b>: <Input
                          width="300px" m={0} p={0} size="xs" variant='filled'
                          value={inputLabel}
                          placeholder="Enter tags here separated by spaces"
                          _placeholder={{ opacity: 1, color: 'gray.400' }}
                          focusBorderColor="gray.500"
                          onChange={handleChange}
                          onKeyDown={(e) => { onSubmit(e, onClose) }}
                        />
                        </ListItem>
                      </UnorderedList>
                    </PopoverBody>
                  </PopoverContent>
                </>
              )}
            </Popover>

            {/* Common Actions */}
            <Tooltip
              placement="top"
              hasArrow={true}
              openDelay={400}
              ml="1"
              label={previousLocation.set && previousLocation.app === app._id ? 'Zoom Back' : 'Zoom to App'}
            >
              <Button onClick={() => moveToApp()} backgroundColor={commonButtonColors} size="xs" ml="1" p={0}>
                <MdZoomOutMap size="14px" color={buttonTextColor} />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={app.data.pinned ? 'Unpin App' : 'Pin App'} openDelay={400} ml="1">
              <Button onClick={togglePin} backgroundColor={commonButtonColors} size="xs" mx="1" p={0} isDisabled={!canPin}>
                {app.data.pinned ? <MdLock size="18px" color={buttonTextColor} /> : <MdLockOpen size="18px" color={buttonTextColor} />}
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Duplicate App'} openDelay={400} ml="1">
              <Button
                onClick={() => duplicate([app._id])}
                backgroundColor={commonButtonColors}
                size="xs"
                mr="1"
                p={0}
                isDisabled={!canDuplicateApp}
              >
                <MdCopyAll size="14px" color={buttonTextColor} />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Close App'} openDelay={400} ml="1">
              <Button onClick={onDeleteOpen} backgroundColor={commonButtonColors} size="xs" mr="1" p={0} isDisabled={!canDeleteApp}>
                <HiOutlineTrash size="18px" color={buttonTextColor} />
              </Button>
            </Tooltip>

            <ConfirmModal
              isOpen={isDeleteOpen}
              onClose={onDeleteClose}
              onConfirm={() => deleteApp(app._id)}
              title="Delete this Application"
              message="Are you sure you want to delete this application?"
              cancelText="Cancel"
              confirmText="Delete"
              cancelColor="green"
              confirmColor="red"
              size="lg"
            />
          </>
        </ErrorBoundary>
      );
    } else {
      // just the delete button
      return (
        <Tooltip placement="top" hasArrow={true} label={'Close App'} openDelay={400} ml="1">
          <Button onClick={() => app?._id && deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mr="1" p={0}>
            <HiOutlineTrash size="18px" color={buttonTextColor} />
          </Button>
        </Tooltip>
      );
    }
  }

  if (showUI && app)
    return (
      <Box
        transform={`translate(${position.x}px, ${position.y}px)`}
        position="absolute"
        ref={boxRef}
        border="solid 3px"
        borderColor={selectColor}
        bg={panelBackground}
        p="2"
        rounded="md"
        transition="opacity 0.7s"
        display="flex"
        opacity={`${appDragging ? '0' : '1'}`}
      >
        <Box display="flex" flexDirection="column">
          <Text
            w="100%"
            textAlign="left"
            mx={1}
            color={textColor}
            fontSize={14}
            fontWeight="bold"
            h={'auto'}
            userSelect={'none'}
            className="handle"
          >
            {app?.data.type}
          </Text>
          <Box alignItems="center" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
            {getAppToolbar()}
          </Box>
        </Box>
      </Box>
    );
  else return null;
}
