/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';

import {
  IconButton,
  Tooltip,
  ButtonGroup,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  useDisclosure,
  Flex,
  Button,
  Box,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  HStack,
  Select,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { IoShapesOutline  } from "react-icons/io5";
import { BiPencil } from 'react-icons/bi';
import { MdGraphicEq, MdOutlineRectangle  } from 'react-icons/md';
import { BsEraserFill } from 'react-icons/bs';
import { FaUndo, FaEraser, FaTrash, FaLink, FaRegCircle, FaArrowRight, FaArrowsAltH } from 'react-icons/fa';

import { LiaMousePointerSolid, LiaHandPaperSolid } from 'react-icons/lia';

import { SAGEColors } from '@sage3/shared';
import { useUserSettings, useUser, useUIStore, useHexColor, ColorPicker, ConfirmModal, useAppStore, useLinkStore } from '@sage3/frontend';

export function Interactionbar(props: {
  isContextMenuOpen?: boolean;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  position?: { x: number; y: number };
}) {
  // Settings
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;
  const isContextMenuOpen = props.isContextMenuOpen ? props.isContextMenuOpen : false;

  // User
  const { user } = useUser();

  // UiStore
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);
  const clearLinkAppId = useLinkStore((state) => state.clearLinkAppId);

  // Tooltip Placment
  const tooltipPlacement = props.tooltipPlacement ? props.tooltipPlacement : 'top';

  // Annotation Settings
  const setClearMarkers = useUIStore((state) => state.setClearMarkers);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const markerColor = useUIStore((state) => state.markerColor);
  const setMarkerColor = useUIStore((state) => state.setMarkerColor);
  const setUndoLastMarker = useUIStore((state) => state.setUndoLastMarker);
  const markerSize = useUIStore((state) => state.markerSize);
  const setMarkerSize = useUIStore((state) => state.setMarkerSize);
  const markerOpacity = useUIStore((state) => state.markerOpacity);
  const setMarkerOpacity = useUIStore((state) => state.setMarkerOpacity);

  // Set user's color to the pen color
  useEffect(() => {
    if (user && markerColor !== user.data.color) setMarkerColor(user.data.color as SAGEColors);
  }, [user?.data.color]);

  // Sliders
  const [sliderValue1, setSliderValue1] = useState(markerOpacity);
  const [showTooltip1, setShowTooltip1] = useState(false);
  const [sliderValue2, setSliderValue2] = useState(markerSize);
  const [showTooltip2, setShowTooltip2] = useState(false);

  // Slider Colors
  const thumbColor = useHexColor(`${markerColor}.600`);
  const sliderBackground = useHexColor(`${markerColor}.100`);
  const sliderColor = useHexColor(markerColor);

  // Color Change
  const handleColorChange = (color: SAGEColors) => {
    if (primaryActionMode !== 'pen' && primaryActionMode !== 'eraser' && primaryActionMode !== 'rectangle' && primaryActionMode !== 'circle' && primaryActionMode !== 'arrow' && primaryActionMode !== 'doubleArrow') {
      setPrimaryActionMode(primaryActionMode);
    }
    setMarkerColor(color);
  };

  // Handle mode switching
  const handleModeChange = (mode: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'doubleArrow') => {
    setPrimaryActionMode(mode);
  };

  // Modals to delete annotations
  // eraseYourLines modal
  const { isOpen: myIsOpen, onOpen: myOnOpen, onClose: myOnClose } = useDisclosure();
  // eraseAllines modal
  const { isOpen: allIsOpen, onOpen: allOnOpen, onClose: allOnClose } = useDisclosure();

  // Annotations popover
  const { isOpen: annotationsIsOpen, onOpen: annotationsOnOpen, onClose: annotationsOnClose } = useDisclosure();
  // Linker popover
  const { isOpen: linkerIsOpen, onOpen: linkerOnOpen, onClose: linkerOnClose } = useDisclosure();

  const eraseYourLines = () => {
    setClearMarkers(true);
    myOnClose();
  };
  const eraseAllines = () => {
    setClearAllMarkers(true);
    allOnClose();
  };

  useEffect(() => {
    if (isContextMenuOpen) {
      annotationsOnClose();
    } else {
      if (primaryActionMode === 'pen' || primaryActionMode === 'eraser' || primaryActionMode === 'rectangle' || primaryActionMode === 'circle' || primaryActionMode === 'arrow' || primaryActionMode == 'doubleArrow') {
        annotationsOnOpen();
      } else {
        annotationsOnClose();
      }
    }
  }, [isContextMenuOpen, primaryActionMode]);

  return (
    <>
      <ButtonGroup isAttached={false} spacing={0} size="xs">
        <Tooltip label={'Selection — [1]'} placement={tooltipPlacement} hasArrow={true} openDelay={400}>
          <IconButton
            borderRadius={'0.5rem 0 0 0.5rem'}
            size="sm"
            colorScheme={primaryActionMode === 'lasso' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'lasso' ? `${user?.data.color}.200` : 'gray.600',
              },
            }}
            icon={<LiaMousePointerSolid />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              annotationsOnClose();
              setPrimaryActionMode('lasso');
              clearLinkAppId();
            }}
          ></IconButton>
        </Tooltip>

        <Tooltip label={'Grab (Panning Tool) — [2]'} placement={tooltipPlacement} hasArrow={true} openDelay={400}>
          <IconButton
            borderRadius={0}
            size="sm"
            colorScheme={primaryActionMode === 'grab' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'grab' ? `${user?.data.color}.200` : 'gray.600', // 'inherit' didnt seem to work
              },
            }}
            icon={<LiaHandPaperSolid />}
            fontSize="lg"
            aria-label={'input-type'}
            onClick={() => {
              annotationsOnClose();
              setPrimaryActionMode('grab');
              setSelectedAppsIds([]);
              setSelectedApp('');
              clearLinkAppId();
            }}
          ></IconButton>
        </Tooltip>

        <Popover isOpen={annotationsIsOpen && (primaryActionMode === 'pen' || primaryActionMode === 'eraser' || primaryActionMode === 'rectangle'|| primaryActionMode ==='circle' || primaryActionMode === 'arrow' || primaryActionMode === 'doubleArrow') }>
          <Tooltip label={'Annotations — [3]'} placement={tooltipPlacement} hasArrow={true} openDelay={400} shouldWrapChildren={true}>
            <PopoverTrigger>
              <IconButton
                 borderRadius={'0 0.5rem 0.5rem 0'}
                size="sm"
                colorScheme={(primaryActionMode === 'pen' || primaryActionMode === 'eraser' || primaryActionMode === 'rectangle' || primaryActionMode === 'circle' || primaryActionMode === 'arrow' || primaryActionMode === 'doubleArrow') ? user?.data.color || 'teal' : 'gray'}
                sx={{
                  _dark: {
                    bg: (primaryActionMode === 'pen' || primaryActionMode === 'eraser' || primaryActionMode === 'rectangle' || primaryActionMode === 'circle' || primaryActionMode === 'arrow' || primaryActionMode === 'doubleArrow') ? `${user?.data.color}.200` : 'gray.600',
                  },
                }}
                icon={<BiPencil />}
                fontSize="lg"
                aria-label={'input-type'}
                onClick={() => {
                  if (annotationsIsOpen) annotationsOnClose();
                  else {
                    if (!isContextMenuOpen) {
                      annotationsOnOpen();
                    }
                  }
                  setPrimaryActionMode('pen');
                  setSelectedApp('');
                  setSelectedAppsIds([]);
                  clearLinkAppId();
                }}
              ></IconButton>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent width="800px">
            <PopoverHeader userSelect="none">Annotations</PopoverHeader>
            <PopoverBody p="4">
              <HStack spacing="4" justify="space-between" align="center">
                {/* Mode Toggle Buttons - Left */}
                <Box display="flex" flexDirection="column" alignItems="left" minW="60px">
                  <Text fontSize="sm" mb="2" userSelect="none">Mode</Text>
                  <ButtonGroup size="sm" isAttached>
                    <Tooltip placement="top" hasArrow label="Marker">
                      <Button
                        colorScheme={primaryActionMode === 'pen' ? user?.data.color || 'teal' : 'gray'}
                        variant={primaryActionMode === 'pen' ? 'solid' : 'outline'}
                        onClick={() => handleModeChange('pen')}
                        px="3"
                      >
                        <BiPencil fontSize="16px" />
                      </Button>
                    </Tooltip>
                    <Tooltip placement="top" hasArrow label="Rectangle">
                      <Button
                        colorScheme={primaryActionMode === 'rectangle' ? user?.data.color || 'teal' : 'gray'}
                        variant={primaryActionMode === 'rectangle' ? 'solid' : 'outline'}
                        onClick={() => handleModeChange('rectangle')}       // NEED TO CHANGE THIS TO ALLOW SHAPE TO BE A VALID MODE
                        px="3"
                      >
                        <MdOutlineRectangle fontSize="16px" /> 
                      </Button>
                    </Tooltip>
                    <Tooltip placement="top" hasArrow label="Circle">
                      <Button
                        colorScheme={primaryActionMode === 'circle' ? user?.data.color || 'teal' : 'gray'}
                        variant={primaryActionMode === 'circle' ? 'solid' : 'outline'}
                        onClick={() => handleModeChange('circle')}
                        px="3"
                      >
                        <FaRegCircle fontSize="16px"/>
                      </Button>
                    </Tooltip>
                    <Tooltip placement="top" hasArrow label="Arrow">
                      <Button
                        colorScheme={primaryActionMode === 'arrow' ? user?.data.color || 'teal' : 'gray'}
                        variant={primaryActionMode === 'arrow' ? 'solid' : 'outline'}
                        onClick={() => handleModeChange('arrow')}
                        px="3"
                      >
                        <FaArrowRight fontSize="16px"/>
                      </Button>
                    </Tooltip>
                    <Tooltip placement="top" hasArrow label="Double Arrow">
                      <Button
                        colorScheme={primaryActionMode === 'doubleArrow' ? user?.data.color || 'teal' : 'gray'}
                        variant={primaryActionMode === 'doubleArrow' ? 'solid' : 'outline'}
                        onClick={() => handleModeChange('doubleArrow')}
                        px="3"
                      >
                        <FaArrowsAltH fontSize="16px"/>
                      </Button>
                    </Tooltip>
                    <Tooltip placement="top" hasArrow label="Eraser">
                      <Button
                        colorScheme={primaryActionMode === 'eraser' ? user?.data.color || 'teal' : 'gray'}
                        variant={primaryActionMode === 'eraser' ? 'solid' : 'outline'}
                        onClick={() => handleModeChange('eraser')}
                        px="3"
                      >
                        <BsEraserFill fontSize="16px"/>
                      </Button>
                    </Tooltip>
                  </ButtonGroup>
                </Box>
                {/* Drawing Controls - Middle */}
                <HStack spacing="3" align="center" flex="1" justify="center">
                  {/* Color Picker */}
                  <Box display="flex" flexDirection="column" alignItems="left" minW="80px">
                    <Text fontSize="sm" mb="2" userSelect="none">Color</Text>
                    <ColorPicker selectedColor={markerColor} onChange={handleColorChange} size="sm" />
                  </Box>

                  {/* Width Select */}
                  <Box display="flex" flexDirection="column" alignItems="left" minW="80px">
                    <Text fontSize="sm" mb="2" userSelect="none">Width</Text>
                    <Menu>
                      <MenuButton as={Button} size="sm" width="80px" variant="outline">
                        {markerSize}
                      </MenuButton>
                      <MenuList>
                        <MenuItem onClick={() => setMarkerSize(1)}>1</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(3)}>3</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(5)}>5</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(8)}>8</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(12)}>12</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(20)}>20</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(32)}>32</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(60)}>60</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(90)}>90</MenuItem>
                        <MenuItem onClick={() => setMarkerSize(120)}>120</MenuItem>
                      </MenuList>
                    </Menu>
                  </Box>

                  {/* Opacity Select */}
                  <Box display="flex" flexDirection="column" alignItems="left" minW="80px">
                    <Text fontSize="sm" mb="2" userSelect="none">Opacity</Text>
                    <Menu>
                      <MenuButton as={Button} size="sm" width="80px" variant="outline">
                        {Math.round(markerOpacity * 100)}%
                      </MenuButton>
                      <MenuList>
                        <MenuItem onClick={() => setMarkerOpacity(0.1)}>10%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.2)}>20%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.3)}>30%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.4)}>40%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.5)}>50%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.6)}>60%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.7)}>70%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.8)}>80%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(0.9)}>90%</MenuItem>
                        <MenuItem onClick={() => setMarkerOpacity(1.0)}>100%</MenuItem>
                      </MenuList>
                    </Menu>
                  </Box>
                </HStack>

                {/* Eraser Controls - Right */}
                <Box display="flex" flexDirection="column" alignItems="left" minW="120px">
                  <Text fontSize="sm" mb="2" userSelect="none">Actions</Text>
                  <HStack spacing="1" align="center">
                    <Tooltip placement="top" hasArrow label="Undo Last Line">
                      <Button onClick={() => setUndoLastMarker(true)} size="sm">
                        <FaUndo fontSize="16px"/>
                      </Button>
                    </Tooltip>

                    <Tooltip placement="top" hasArrow label="Erase Your Lines">
                      <Button onClick={myOnOpen} size="sm">
                        <FaEraser  fontSize="16px"/>
                      </Button>
                    </Tooltip>

                    <Tooltip placement="top" hasArrow label="Erase All">
                      <Button onClick={allOnOpen} size="sm">
                        <FaTrash fontSize="16px"/>
                      </Button>
                    </Tooltip>
                  </HStack>
                </Box>
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
        {/* 
        
        */}
        <Tooltip label={'Linker — [4]'} placement={tooltipPlacement} hasArrow={true} openDelay={400} shouldWrapChildren={true}>
          <IconButton
            borderRadius={'0 0.5rem 0.5rem 0'}
            size="sm"
            colorScheme={primaryActionMode === 'linker' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'linker' ? `${user?.data.color}.200` : 'gray.600',
              },
            }}
            icon={<FaLink />}
            fontSize="lg"
            aria-label={'linker-mode'}
            onClick={() => {
              annotationsOnClose();
              setPrimaryActionMode('linker');
            }}
          ></IconButton>
        </Tooltip>
      </ButtonGroup>

      {myIsOpen && (
        <ConfirmModal
          isOpen={myIsOpen}
          onClose={myOnClose}
          onConfirm={eraseYourLines}
          title="Erase Your Annotations"
          message="Are you sure you want to erase your annotations?"
          cancelText="Cancel"
          confirmText="Erase"
          cancelColor="green"
          confirmColor="red"
          size="lg"
          xOffSet={props.position ? (props.position.x + 150) / window.innerWidth : undefined}
        />
      )}
      {allIsOpen && (
        <ConfirmModal
          isOpen={allIsOpen}
          onClose={allOnClose}
          onConfirm={eraseAllines}
          title="Erase All Annotations"
          message="🧯CAUTION🧯: Are you sure you want to erase ALL annotations?"
          cancelText="Cancel"
          confirmText="Erase"
          cancelColor="green"
          confirmColor="red"
          size="lg"
          xOffSet={props.position ? (props.position.x + 150) / window.innerWidth : undefined}
        />
      )}
    </>
  );
}
