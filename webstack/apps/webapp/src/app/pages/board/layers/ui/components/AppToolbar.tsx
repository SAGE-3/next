/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  HStack,
  VStack,
  Tag,
  TagLabel,
  TagCloseButton,
  keyframes,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spacer,
} from '@chakra-ui/react';

import {
  MdClose,
  MdCopyAll,
  MdInfoOutline,
  MdZoomOutMap,
  MdTv,
  MdAddCircleOutline,
  MdExpandMore,
  MdExpandLess,
  MdMenu,
  MdPushPin,
  MdOutlinePushPin,
} from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';
import { IoMdExit } from 'react-icons/io';
import { IoSparklesSharp } from 'react-icons/io5';

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
  usePresenceStore,
  useUserSettings,
  ColorPicker,
  truncateWithEllipsis,
  setupApp,
  useAssetStore,
  apiUrls,
} from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';
import { AI_ENABLED_APPS, Applications } from '@sage3/applications/apps';
import { Position, Size } from '@sage3/shared/types';
import ky from 'ky';

type AppToolbarProps = {
  boardId: string;
  roomId: string;
};

type TagFrequency = Record<string, number>;

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
  const createApp = useAppStore((state) => state.create);
  const update = useAppStore((state) => state.update);
  const duplicate = useAppStore((state) => state.duplicateApps);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);

  const textColor = useColorModeValue('gray.800', 'gray.100');
  const commonButtonColors = useColorModeValue('gray.300', 'gray.200');
  const buttonTextColor = useColorModeValue('white', 'black');
  const selectColor = useHexColor('teal');
  const intelligenceColor = useColorModeValue('purple.500', 'purple.400');
  const intelligenceBgColor = useColorModeValue('purple.400', 'purple.500');

  // Settings
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  const showTags = settings.showTags;

  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const scale = useUIStore((state) => state.scale);
  const appDragging = useUIStore((state) => state.appDragging);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  // Access the list of users
  const users = useUsersStore((state) => state.users);
  // Presence Information
  const presences = usePresenceStore((state) => state.presences);

  // Position state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const [previousLocation, setPreviousLocation] = useState({ x: 0, y: 0, s: 1, set: false, app: '' });
  const [previousSize, setPreviousSize] = useState({ x: 0, y: 0, w: 0, h: 0, set: false, app: '' });

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

  // Hooks for getAppTags()
  const [visibleTags, setVisibleTags] = useState<string[]>([]);
  const [overflowTags, setOverflowTags] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // state for Add Tag modal visibility
  const { isOpen: isDeleteTagOpen, onOpen: onDeleteTagOpen, onClose: onDeleteTagClose } = useDisclosure(); // for delete tag modal
  const [tagToDelete, setTagToDelete] = useState<string>(''); // store tagname to be deleted
  const [oldTag, setOldTag] = useState<string>(''); // store previous tag before editing
  const [inputValue, setInputValue] = useState<string>(''); // state of input box for adding tags
  const [inputAlert, setInputAlert] = useState<string>(''); // alert users of input errors
  const [invalidTagAnimation, setInvalidTagAnimation] = useState<boolean>(false); // state of shake animation for invalid input
  const [tagColor, setTagColor] = useState<SAGEColors>('teal'); // store current color of the ColorPicker
  const tagsContainerRef = useRef<HTMLDivElement>(null); // ref to the container holding tags
  const [isOverflowOpen, setIsOverflowOpen] = useState<boolean>(false); // manage overflow menu visibility
  const overflowBg = useColorModeValue('gray.50', 'gray.700'); // overflow menu colors based on light/dark mode
  const toast = useToast();

  useEffect(() => {
    // Keep track of frequency of all tags
    const tagFrequency: TagFrequency = {};
    insights.forEach((insight) => {
      insight.data.labels.forEach((tag) => {
        if (tagFrequency[tag]) {
          tagFrequency[tag] += 1;
        } else {
          tagFrequency[tag] = 1;
        }
      });
    });

    // Set current app's tags in sorted order
    if (insights && insights.length > 0 && app) {
      // Match the app with the insight
      const insight = insights.find((el) => el._id === app._id);
      if (insight) {
        // if found, update the tags
        const appTags = insight.data.labels;
        // Store sorted order of tags
        const sorted = appTags.slice().sort((a, b) => {
          return tagFrequency[b] - tagFrequency[a]; // Sort in descending order
        });
        setTags(sorted);
        setInputLabel(sorted.join(' '));
      }
    }
  }, [insights, app]);

  // Separate tags into two lists
  useEffect(() => {
    setVisibleTags(tags.slice(0, 3));
    setOverflowTags(tags.slice(3));
  }, [tags]);

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

  /**
   * Are two rectangles overlapping
   * @param rec1
   * @param rec2
   * @returns
   */
  function isRectangleOverlap(rec1: number[], rec2: number[]) {
    return Math.min(rec1[2], rec2[2]) - Math.max(rec1[0], rec2[0]) > 0 && Math.min(rec1[3], rec2[3]) - Math.max(rec1[1], rec2[1]) > 0;
  }

  /**
   * Scale the app to fit inside the smallest overlapping viewport
   */
  function scaleApp() {
    if (app) {
      if (previousSize.set && previousSize.app === app._id) {
        // Restore the previous size
        update(app._id, {
          size: { ...app.data.size, width: previousSize.w, height: previousSize.h },
          position: { ...app.data.position, x: previousSize.x, y: previousSize.y },
        });
        // Clear the settings
        setPreviousSize({ ...previousSize, set: false, app: '' });
        return;
      } else {
        const potentialPresences: { position: Position; size: Size; sizeRatio: number }[] = [];
        const res = presences
          .filter((el) => el.data.boardId === props.boardId)
          .map((presence) => {
            const u = users.find((el) => el._id === presence.data.userId);
            if (!u) return null;
            const viewport = presence.data.viewport;
            const isWall = u.data.userType === 'wall';
            return isWall ? viewport : null;
          });
        const r1 = [
          app.data.position.x,
          app.data.position.y,
          app.data.position.x + app.data.size.width,
          app.data.position.y + app.data.size.height,
        ];
        const appSize = app.data.size.width * app.data.size.height;
        const appRatio = app.data.size.width / app.data.size.height;
        res.forEach((v) => {
          // first true result will be used
          if (v) {
            const x = v.position.x;
            const y = v.position.y;
            const w = v.size.width;
            const h = v.size.height;
            const r2 = [x, y, x + w, y + h];
            const overlapping = isRectangleOverlap(r1, r2);
            if (overlapping) {
              potentialPresences.push({ ...v, sizeRatio: (w * h) / appSize });
            }
          }
        });
        // Sort by area ratio to the app size
        potentialPresences.sort((a, b) => a.sizeRatio - b.sizeRatio);
        // Pick the smallest area ratio
        if (potentialPresences[0]) {
          const v = potentialPresences[0];
          const x = v.position.x;
          const y = v.position.y;
          const w = v.size.width;
          const h = v.size.height;
          const viewportRatio = w / h;
          let newsize = structuredClone(v.size);
          let newpos = structuredClone(v.position);
          if (viewportRatio > appRatio) {
            newsize.width = h * 0.9 * appRatio;
            newsize.height = h * 0.9;
          } else {
            newsize.width = w * 0.9;
            newsize.height = (w * 0.9) / appRatio;
          }
          newpos.x = x + (w - newsize.width) / 2;
          newpos.y = y + (h - newsize.height) / 2;

          // Save the previous size
          setPreviousSize({
            x: app.data.position.x,
            y: app.data.position.y,
            w: app.data.size.width,
            h: app.data.size.height,
            set: true,
            app: app._id,
          });

          // Update the app size and position
          update(app._id, { size: newsize, position: newpos });
        }
      }
    }
  }

  const togglePin = () => {
    if (app) {
      update(app._id, { pinned: !app.data.pinned });
    }
  };

  function getAppTags() {
    // Semantic to separate a tag's string name from color
    const delimiter = ':';

    // Define the invalid input shake animation
    const shakeAnimation = keyframes`
      0% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      50% { transform: translateX(10px); }
      75% { transform: translateX(-10px); }
      100% { transform: translateX(0); }
    `;

    // Update state on input change and validate
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      let isValid = true;

      // Input contains delimiter
      if (event.target.value.includes(delimiter)) {
        setInputAlert('Colon ":" is not permitted.');
        isValid = false;
      }

      // Add tag mode
      if (oldTag == '') {
        // Split tags by space and remove empty strings
        const newTags = event.target.value.split(' ').filter((tag) => tag.trim() !== '');

        // Add up to 5 tags at once
        if (newTags.length > 5) {
          setInputAlert('A maximum of 5 tags can be added at once.');
          isValid = false;
        }
        // Max 20 characters per tag
        newTags.forEach((tag) => {
          if (tag.length > 20) {
            setInputAlert('Tags must be 20 characters or less.');
            isValid = false;
          }
        });
      }
      // Edit tag mode
      else {
        // Prevent spaces while editing a tag
        if (event.target.value.includes(' ')) {
          setInputAlert('Tag cannot contain spaces.');
          isValid = false;
        }
        if (event.target.value.length > 20) {
          setInputAlert('Tag must be 20 characters or less.');
          isValid = false;
        }
      }

      // Only update input value if user input is valid
      if (isValid) {
        setInputValue(event.target.value);
        setInputAlert('');
      } else {
        setInvalidTagAnimation(true);
        setTimeout(() => setInvalidTagAnimation(false), 500);
      }
    };

    // Delete a tag
    const handleDeleteTag = () => {
      const newTags = tags.filter((tag) => tag !== tagToDelete);
      if (app) {
        updateInsight(app._id, { labels: newTags });
      }

      // Close delete tag modal
      onDeleteTagClose();
    };

    // Show modal for adding a new tag
    const openAddModal = () => {
      setOldTag('');
      setIsModalOpen(true);
    };

    // Show modal for editing a tag
    const openEditModal = (tag: string) => {
      setOldTag(tag);
      setInputValue(tag.split(delimiter)[0]);
      setTagColor(tag.split(delimiter)[1] as SAGEColors);
      setIsModalOpen(true);
    };

    // Close modal and clear input value
    const handleCloseModal = () => {
      setIsModalOpen(false);
      setInputValue('');
      setInvalidTagAnimation(false);
    };

    // Handle adding or editing a new tag from the modal
    const handleTagFromModal = () => {
      // Remove input alert errors
      setInputAlert('');

      if (oldTag === '') {
        // add mode
        // Split tags by space and remove empty strings
        const newTags = inputValue.split(' ').filter((tag) => tag.trim() !== '');
        // Append the color of the tag
        const coloredTags = newTags.map((tag) => tag + delimiter + tagColor);
        // Filter out tags already in the list and ensure uniqueness
        const uniqueNewTags = Array.from(new Set(coloredTags.filter((tag) => !tags.includes(tag))));

        if (uniqueNewTags.length > 0) {
          const updatedTags = [...tags, ...uniqueNewTags];
          if (app) updateInsight(app._id, { labels: updatedTags });
          toast({
            title: 'New Tags Successfully Added',
            status: 'success',
            duration: 3000,
          });

          setInputValue('');
          // Close the modal after adding the tag
          setIsModalOpen(false);
        } else {
          toast({
            title: 'No New Tags To Add',
            status: 'warning',
            duration: 3000,
          });
        }
      } else {
        // edit mode
        const newTag = inputValue + delimiter + tagColor;

        if (inputValue === '') {
          toast({
            title: 'Tag Cannot Be Empty',
            status: 'warning',
            duration: 3000,
          });
        } else if (tags.includes(newTag)) {
          toast({
            title: 'App Already Has This Tag',
            status: 'warning',
            duration: 3000,
          });
        } else {
          const updatedTags = tags.filter((tag) => tag !== oldTag); // remove old tag
          if (app) updateInsight(app._id, { labels: [...updatedTags, newTag] });

          toast({
            title: 'Successfully Modified Tag',
            status: 'success',
            duration: 3000,
          });

          setInputValue('');
          setIsModalOpen(false);
        }
      }
    };

    const handleColorChange = (color: string) => {
      setTagColor(color as SAGEColors);
    };

    return (
      <HStack spacing={1} ref={tagsContainerRef}>
        {/* Main list of tags */}
        {visibleTags.map((tag, index) => (
          <Tag
            id={`tag-${tag}`}
            size="sm"
            key={index}
            borderRadius="md"
            variant="solid"
            cursor="pointer"
            fontSize="12px"
            colorScheme={tag.split(delimiter)[1]}
            onClick={() => openEditModal(tag)}
          >
            <Tooltip placement="top" hasArrow={true} openDelay={400} maxWidth={'fit-content'} label={'Edit Tag'}>
              <TagLabel m={0}>{truncateWithEllipsis(tag.split(delimiter)[0], 10)}</TagLabel>
            </Tooltip>
            <Tooltip placement="top" hasArrow={true} openDelay={400} maxWidth={'fit-content'} label={'Delete Tag'}>
              <TagCloseButton
                m={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setTagToDelete(tag);
                  onDeleteTagOpen();
                }}
              />
            </Tooltip>
          </Tag>
        ))}
        {/* Menu for overflow tags */}
        {overflowTags.length > 0 && (
          <Box>
            <Tooltip placement="top" hasArrow={true} openDelay={400} label={isOverflowOpen ? 'Hide more tags' : 'Show more tags'}>
              <Button size="xs" p={0} width="30px" cursor="pointer" onClick={() => setIsOverflowOpen(!isOverflowOpen)}>
                {isOverflowOpen ? <MdExpandLess size="14px" /> : <MdExpandMore size="14px" />}
              </Button>
            </Tooltip>

            {isOverflowOpen && (
              <Box
                position="absolute"
                top="10"
                bg={overflowBg}
                borderWidth="1px"
                boxShadow="md"
                minWidth="200px"
                maxHeight="200px"
                overflowY="auto"
                borderRadius="md"
                p={3}
                zIndex={100}
              >
                <VStack spacing={2} align="flex-start">
                  {overflowTags.map((tag, index) => (
                    <Tag
                      id={`tag-${tag}`}
                      size="sm"
                      key={index}
                      borderRadius="md"
                      variant="solid"
                      cursor="pointer"
                      fontSize="12px"
                      colorScheme={tag.split(delimiter)[1]}
                      onClick={() => openEditModal(tag)}
                    >
                      <TagLabel m={0}>{truncateWithEllipsis(tag.split(delimiter)[0], 10)}</TagLabel>
                      <TagCloseButton
                        m={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTagToDelete(tag);
                          onDeleteTagOpen();
                        }}
                      />
                    </Tag>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>
        )}
        {/* Button to add tag */}
        <Box>
          <Tooltip placement="top" hasArrow={true} openDelay={400} label="Add tag">
            <Button onClick={openAddModal} size="xs">
              <MdAddCircleOutline size="14px" />
            </Button>
          </Tooltip>
        </Box>
        {/* Modal for adding or editing a new tag */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} isCentered>
          <ModalOverlay />
          <ModalContent sx={{ maxW: '410px' }}>
            <ModalHeader>{oldTag === '' ? 'Add Tag' : 'Edit Tag'}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Input
                width="360px"
                mb={5}
                placeholder={oldTag === '' ? 'Enter tags separated by spaces' : ''}
                _placeholder={{ opacity: 1, color: 'gray.400' }}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTagFromModal();
                }}
                animation={invalidTagAnimation ? `${shakeAnimation} 0.5s ease-in-out` : 'none'}
                autoFocus
              />
              <ColorPicker onChange={handleColorChange} selectedColor={tagColor as SAGEColors} />
              {inputAlert !== '' && (
                <Alert status="warning" mt={5} width="360px" variant="left-accent">
                  <AlertIcon />
                  <AlertDescription>{inputAlert}</AlertDescription>
                </Alert>
              )}
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="green" onClick={handleTagFromModal} width="80px" mr={3}>
                {oldTag === '' ? 'Add' : 'Save'}
              </Button>
              <Button colorScheme="red" onClick={handleCloseModal} width="80px">
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* Delete tag confirmation */}
        <ConfirmModal
          isOpen={isDeleteTagOpen}
          onClose={onDeleteTagClose}
          onConfirm={handleDeleteTag}
          title="Delete this Tag"
          message="Are you sure you want to delete this tag from this app?"
          cancelText="Cancel"
          confirmText="Delete"
          cancelColor="green"
          confirmColor="red"
          size="lg"
        />
      </HStack>
    );
  }

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
                    <Button backgroundColor={commonButtonColors} size="xs" mx="1" p={0}>
                      <MdInfoOutline fontSize={'18px'} color={buttonTextColor} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent fontSize={'sm'} width={'375px'}>
                    <PopoverArrow />
                    <PopoverCloseButton />
                    <PopoverHeader>Application Information</PopoverHeader>
                    <PopoverBody userSelect={'text'}>
                      <UnorderedList>
                        <ListItem>
                          <b>ID</b>: {app._id}
                        </ListItem>
                        <ListItem>
                          <b>Type</b>: {app.data.type}
                        </ListItem>
                        <ListItem>
                          <b>Owner</b>: {ownerName}
                        </ListItem>
                        <ListItem>
                          <b>Created</b>: {when}
                        </ListItem>
                      </UnorderedList>
                    </PopoverBody>
                  </PopoverContent>
                </>
              )}
            </Popover>

            {/* Hamburger */}
            <Menu placement="top-start">
              <Tooltip hasArrow={true} label={'Actions'} openDelay={300}>
                <MenuButton size="xs" as={Button} backgroundColor={commonButtonColors} mr="1" p={0} display="grid" placeItems="center">
                  <MdMenu size="14px" color={buttonTextColor} />
                </MenuButton>
              </Tooltip>
              <MenuList minWidth="150px" fontSize={'sm'} py="1px" m="0">
                <MenuItem
                  icon={app.data.pinned ? <MdPushPin size="18px" /> : <MdOutlinePushPin size="18px" />}
                  onClick={togglePin}
                  isDisabled={!canPin}
                >
                  {app.data.pinned ? 'Unpin Application' : 'Pin Application'}
                </MenuItem>
                <MenuItem
                  icon={<MdCopyAll size="18px" />}
                  onClick={() => duplicate([app._id])}
                  isDisabled={!canDuplicateApp}
                  py="1px"
                  m="0"
                >
                  Duplicate Application
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={<MdTv size="18px" />} onClick={() => scaleApp()} py="1px" m="0">
                  {previousSize.app === app._id && previousSize.set ? 'Restore' : 'Present inside Viewport'}
                </MenuItem>
                <MenuItem icon={<MdZoomOutMap size="18px" />} onClick={() => moveToApp()} py="1px" m="0">
                  {previousLocation.set && previousLocation.app === app._id ? 'Zoom Back' : 'Zoom to Application'}
                </MenuItem>
                <MenuDivider />

                <MenuItem icon={<IoMdExit size="18px" />} onClick={() => setSelectedApp('')} py="1px" m="0">
                  Deselect Application
                </MenuItem>
              </MenuList>
            </Menu>

            <Tooltip placement="top" hasArrow={true} label={'Delete Application'} openDelay={400} ml="1">
              <Button onClick={onDeleteOpen} colorScheme="red" size="xs" mr="1" p={0} isDisabled={!canDeleteApp}>
                <HiOutlineTrash size="18px" />
              </Button>
            </Tooltip>

            <ConfirmModal
              isOpen={isDeleteOpen}
              onClose={onDeleteClose}
              onConfirm={() => deleteApp(app._id)}
              title="Delete Application"
              message="Are you sure you want to delete this application?"
              cancelText="Cancel"
              confirmText="Delete"
              confirmColor="red"
              size="lg"
              xOffSet={Math.min(0.75, (position.x + 150) / window.innerWidth)}
            />
          </>
        </ErrorBoundary>
      );
    } else {
      // just the delete button
      return (
        <Tooltip placement="top" hasArrow={true} label={'Close Application'} openDelay={400} ml="1">
          <Button onClick={() => app?._id && deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mr="1" p={0}>
            <HiOutlineTrash size="18px" color={buttonTextColor} />
          </Button>
        </Tooltip>
      );
    }
  }

  /**
   * Get the text selected by the user in the app
   * @param id string application id
   * @returns string | null
   */
  function getTextSelection(id: string): string | null {
    const elt = document.getElementById(`app_${id}`);
    if (elt) {
      const ta = elt.getElementsByTagName('textarea');
      if (ta) {
        const start = ta[0].selectionStart;
        const end = ta[0].selectionEnd;
        if (start !== end) {
          return ta[0].value.substring(start, end);
        } else {
          return null;
        }
      }
    }
    // Get the text selected by the user: maybe get the text from other apps
    // const selObj = window.getSelection();
    // if (selObj && selObj.anchorNode) {
    //   return selObj.toString();
    // }
    return null;
  }

  const openChat = async () => {
    if (app) {
      const w = 800;
      const h = 720;
      const x = app.data.position.x + app.data.size.width + 20;
      const y = app.data.position.y;
      let context = '';
      // Specific cases for each app to build a context for the LLM
      if (app.data.type === 'Stickie') {
        const selection = getTextSelection(app._id);
        context = selection || app.data.state.text;
      } else if (app.data.type === 'CodeEditor') {
        const selection = getTextSelection(app._id);
        const code = selection || app.data.state.content;
        // Get the source code of the editor
        context = `Language ${app.data.state.language}:\n\n${code}`;
      } else if (app.data.type === 'CSVViewer') {
        // Get information about the asset
        const asset = useAssetStore.getState().assets.find((a) => a._id === app.data.state.assetid);
        if (asset) {
          const dl = apiUrls.assets.getAssetById(asset.data.file);
          // get the content of the CSV file
          const csv = await ky.get(dl).text();
          context = csv;
        }
      } else {
        // Otherwise, serialize the whole app state
        context = JSON.stringify(app.data.state, null, 2);
      }
      if (context) {
        // Create the chat app with the context
        const source = app._id;
        const state = setupApp('', 'Chat', x, y, props.roomId, props.boardId, { w, h }, { context, sources: [source] });
        createApp(state);
        useUIStore.getState().setSelectedApp('');
      }
    }
  };

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
          <Box display="flex" flexDirection="row">
            <Text textAlign="left" mx={0} p={0} color={textColor} fontSize={14} fontWeight="bold" h={'auto'} userSelect={'none'}>
              {app?.data.type}
            </Text>
            <Box display={showTags ? 'flex' : 'none'} pl="1">
              {getAppTags()}
            </Box>

            <Spacer />

            {/* Sage Intelligence */}
            {
              // Is app AiEnabled
              AI_ENABLED_APPS.includes(app.data.type) && (
                <Box>
                  <Tooltip placement="top" hasArrow={true} openDelay={400} ml="1" label={'Chat with SAGE Intelligence'}>
                    <Button
                      onClick={openChat}
                      backgroundColor={intelligenceColor}
                      variant="solid"
                      size="xs"
                      m={0}
                      mr={2}
                      p={0}
                      _hover={{ cursor: 'pointer', transform: 'scale(1.2)', opacity: 1, backgroundColor: intelligenceBgColor }}
                    >
                      <IoSparklesSharp size="16px" color={'white'} />
                    </Button>
                  </Tooltip>
                </Box>
              )
            }
          </Box>

          <Box alignItems="center" mt="1" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
            {getAppToolbar()}
          </Box>
        </Box>
      </Box>
    );
  else return null;
}
