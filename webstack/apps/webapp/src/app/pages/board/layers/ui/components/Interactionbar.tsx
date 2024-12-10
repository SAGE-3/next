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
  useColorModeValue,
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
} from '@chakra-ui/react';

import { BiPencil } from 'react-icons/bi';
import { MdGraphicEq } from 'react-icons/md';
import { BsEraserFill } from 'react-icons/bs';
import { FaUndo, FaEraser, FaTrash } from 'react-icons/fa';
import { LiaMousePointerSolid, LiaHandPaperSolid } from 'react-icons/lia';

import { SAGEColors } from '@sage3/shared';
import { useUserSettings, useUser, useUIStore, useHexColor, ColorPicker, ConfirmModal, useCursorBoardPosition } from '@sage3/frontend';

export function Interactionbar(props: {
  isContextMenuOpen?: boolean;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right',
  position?: { x: number; y: number }
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
    if (primaryActionMode !== 'pen' && primaryActionMode !== 'eraser') {
      setPrimaryActionMode('pen');
    }
    setMarkerColor(color);
  };

  // Modals to delete annotations
  // eraseYourLines modal
  const { isOpen: myIsOpen, onOpen: myOnOpen, onClose: myOnClose } = useDisclosure();
  // eraseAllines modal
  const { isOpen: allIsOpen, onOpen: allOnOpen, onClose: allOnClose } = useDisclosure();

  // Annotations popover
  const { isOpen: annotationsIsOpen, onOpen: annotationsOnOpen, onClose: annotationsOnClose } = useDisclosure();
  // Eraser popover
  const { isOpen: eraserIsOpen, onOpen: eraserOnOpen, onClose: eraserOnClose } = useDisclosure();

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
      eraserOnClose();
      annotationsOnClose();
    } else {
      if (primaryActionMode === 'pen') {
        eraserOnClose();
        annotationsOnOpen();
      } else if (primaryActionMode === 'eraser') {
        annotationsOnClose();
        eraserOnOpen();
      } else {
        eraserOnClose();
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
              eraserOnClose();
              annotationsOnClose();
              setPrimaryActionMode('lasso');
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
              eraserOnClose();
              annotationsOnClose();
              setPrimaryActionMode('grab');
              setSelectedAppsIds([]);
              setSelectedApp('');
            }}
          ></IconButton>
        </Tooltip>

        <Popover isOpen={annotationsIsOpen && primaryActionMode === 'pen'}>
          <Tooltip label={'Annotations — [3]'} placement={tooltipPlacement} hasArrow={true} openDelay={400} shouldWrapChildren={true}>
            <PopoverTrigger>
              <IconButton
                borderRadius={0}
                size="sm"
                colorScheme={primaryActionMode === 'pen' ? user?.data.color || 'teal' : 'gray'}
                sx={{
                  _dark: {
                    bg: primaryActionMode === 'pen' ? `${user?.data.color}.200` : 'gray.600',
                  },
                }}
                icon={<BiPencil />}
                fontSize="lg"
                aria-label={'input-type'}
                onClick={() => {
                  eraserOnClose();
                  if (annotationsIsOpen) annotationsOnClose();
                  else {
                    if (!isContextMenuOpen) {
                      annotationsOnOpen();
                    }
                  }
                  setPrimaryActionMode('pen');
                  setSelectedApp('');
                  setSelectedAppsIds([]);
                }}
              ></IconButton>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent width="100%">
            <PopoverHeader userSelect="none">Annotations</PopoverHeader>
            <PopoverBody>
              <Flex direction="column" alignItems="center" my="2">
                <Flex>
                  <ColorPicker selectedColor={markerColor} onChange={handleColorChange} size="sm"></ColorPicker>
                </Flex>
                <Flex width="100%" mt="3">
                  <Text userSelect="none"> Width</Text>
                  <Slider
                    defaultValue={markerSize}
                    min={1}
                    max={80}
                    step={1}
                    size={'md'}
                    ml="6"
                    onChangeEnd={(v) => setMarkerSize(v)}
                    onChange={(v) => setSliderValue2(v)}
                    onMouseEnter={() => setShowTooltip2(true)}
                    onMouseLeave={() => setShowTooltip2(false)}
                  >
                    <SliderTrack bg={sliderBackground}>
                      <Box position="relative" right={10} />
                      <SliderFilledTrack bg={sliderColor} />
                    </SliderTrack>
                    <Tooltip hasArrow bg="teal.500" color="white" placement="top" isOpen={showTooltip2} label={`${sliderValue2}`}>
                      <SliderThumb boxSize={4}>
                        <Box color={thumbColor} as={MdGraphicEq} />
                      </SliderThumb>
                    </Tooltip>
                  </Slider>
                </Flex>
                <Flex width="100%" mt="3">
                  <Text userSelect="none">Opacity</Text>
                  <Slider
                    defaultValue={markerOpacity}
                    min={0.1}
                    max={1}
                    step={0.1}
                    size={'md'}
                    ml="3"
                    onChangeEnd={(v) => setMarkerOpacity(v)}
                    onChange={(v) => setSliderValue1(v)}
                    onMouseEnter={() => setShowTooltip1(true)}
                    onMouseLeave={() => setShowTooltip1(false)}
                  >
                    <SliderTrack bg={sliderBackground}>
                      <Box position="relative" right={10} />
                      <SliderFilledTrack bg={sliderColor} />
                    </SliderTrack>
                    <Tooltip hasArrow bg="teal.500" color="white" placement="top" isOpen={showTooltip1} label={`${sliderValue1}`}>
                      <SliderThumb boxSize={4}>
                        <Box color={thumbColor} as={MdGraphicEq} />
                      </SliderThumb>
                    </Tooltip>
                  </Slider>
                </Flex>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </Popover>
        <Popover isOpen={eraserIsOpen && primaryActionMode === 'eraser'}>
          <Tooltip label={'Eraser — [4]'} placement={tooltipPlacement} hasArrow={true} openDelay={400} shouldWrapChildren={true}>
            <PopoverTrigger>
              <IconButton
                borderRadius={'0 0.5rem 0.5rem 0'}
                size="sm"
                colorScheme={primaryActionMode === 'eraser' ? user?.data.color || 'teal' : 'gray'}
                sx={{
                  _dark: {
                    bg: primaryActionMode === 'eraser' ? `${user?.data.color}.200` : 'gray.600',
                  },
                }}
                icon={<BsEraserFill />}
                fontSize="lg"
                aria-label={'input-type'}
                onClick={() => {
                  annotationsOnClose();
                  if (eraserIsOpen) eraserOnClose();
                  else {
                    if (!isContextMenuOpen) {
                      eraserOnOpen();
                    }
                  }
                  setPrimaryActionMode('eraser');
                  setSelectedApp('');
                  setSelectedAppsIds([]);
                }}
              ></IconButton>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent width="172px">
            <PopoverHeader userSelect="none">Eraser</PopoverHeader>
            <PopoverBody>
              <Flex direction="row" alignContent="left" my="2">
                <Tooltip placement="top" hasArrow label="Undo Last Line">
                  <Button onClick={() => setUndoLastMarker(true)} ml="2" size="sm">
                    <FaUndo />
                  </Button>
                </Tooltip>

                <Tooltip placement="top" hasArrow label="Erase Your Lines">
                  <Button onClick={myOnOpen} ml="2" size="sm">
                    <FaEraser />
                  </Button>
                </Tooltip>

                <Tooltip placement="top" hasArrow label="Erase All">
                  <Button onClick={allOnOpen} ml="2" size="sm">
                    <FaTrash />
                  </Button>
                </Tooltip>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </ButtonGroup>

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

    </>
  );
}
