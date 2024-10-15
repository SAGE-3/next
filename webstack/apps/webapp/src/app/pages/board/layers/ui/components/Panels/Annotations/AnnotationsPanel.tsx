/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  useToast,
  Tooltip,
  Text,
  HStack,
  VStack,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  useDisclosure,
} from '@chakra-ui/react';

import { MdGraphicEq } from 'react-icons/md';
import { BsPencilFill, BsEraserFill } from 'react-icons/bs';
import { FaEraser, FaTrash, FaCamera, FaUndo } from 'react-icons/fa';

import {
  ColorPicker,
  useUIStore,
  usePanelStore,
  useUser,
  isElectron,
  useHexColor,
  useThrottleApps,
  ConfirmModal,
  useUserSettings,
} from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';

import { Panel } from '../Panel';

export function AnnotationsPanel() {
  const { setPrimaryActionMode, settings } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  // UI Store
  const { toggleShowUI } = useUserSettings();

  const fitApps = useUIStore((state) => state.fitApps);
  const apps = useThrottleApps(250);
  // User
  const { user } = useUser();

  // Whiteboard information
  const setClearMarkers = useUIStore((state) => state.setClearMarkers);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const markerColor = useUIStore((state) => state.markerColor);
  const setMarkerColor = useUIStore((state) => state.setMarkerColor);
  const setUndoLastMarker = useUIStore((state) => state.setUndoLastMarker);
  const markerSize = useUIStore((state) => state.markerSize);
  const setMarkerSize = useUIStore((state) => state.setMarkerSize);
  const markerOpacity = useUIStore((state) => state.markerOpacity);
  const setMarkerOpacity = useUIStore((state) => state.setMarkerOpacity);

  // Get the annotation panel
  const panel = usePanelStore((state) => state.panels['annotations']);
  // Notifications
  const toast = useToast();

  // Sliders
  const [sliderValue1, setSliderValue1] = useState(markerOpacity);
  const [showTooltip1, setShowTooltip1] = useState(false);
  const [sliderValue2, setSliderValue2] = useState(markerSize);
  const [showTooltip2, setShowTooltip2] = useState(false);

  // Slider Colors
  const thumbColor = useHexColor(`${markerColor}.600`);
  const sliderBackground = useHexColor(`${markerColor}.100`);
  const sliderColor = useHexColor(markerColor);

  // eraseYourLines modal
  const { isOpen: myIsOpen, onOpen: myOnOpen, onClose: myOnClose } = useDisclosure();
  // eraseAllines modal
  const { isOpen: allIsOpen, onOpen: allOnOpen, onClose: allOnClose } = useDisclosure();

  // Set user's color to the pen color
  useEffect(() => {
    if (user && markerColor !== user.data.color) setMarkerColor(user.data.color as SAGEColors);
  }, [user?.data.color]);

  // Track the panel state to enable/disable the pen
  useEffect(() => {
    if (panel) {
      if (panel.show && primaryActionMode !== 'pen' && primaryActionMode !== 'eraser') {
        setPrimaryActionMode('pen');
      }
    }
  }, [panel?.show]);

  const handleColorChange = (color: SAGEColors) => {
    if (primaryActionMode !== 'pen' && primaryActionMode !== 'eraser') {
      setPrimaryActionMode('pen');
    }
    setMarkerColor(color);
  };

  const screenshot = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.shiftKey) {
      // Cleanup the board
      toast.closeAll();
      toggleShowUI();
      fitApps(apps);
    }
    // Ask electron to take a screenshot
    if (isElectron()) {
      setTimeout(() => {
        // send the message to the main process
        // small delay to make sure the board is rendered
        window.electron.send('take-screenshot', {});
      }, 100);
      // Restore the UI
      setTimeout(() => {
        if (event.shiftKey) {
          toggleShowUI();
        }
      }, 3000);
    }
  };

  // Modals to delete annotations
  const eraseYourLines = () => {
    setClearMarkers(true);
    myOnClose();
  };
  const eraseAllines = () => {
    setClearAllMarkers(true);
    allOnClose();
  };

  // useEffect(() => {
  //   // Disable marker on entry
  //   setWhiteboardMode('none');
  //   return () => {
  //     // Disable marker on leave
  //     setWhiteboardMode('none');
  //   };
  // }, []);

  return (
    <>
      <Panel title="Annotations" name="annotations" width={600} showClose={false}>
        <Box alignItems="center" pb="1" width="100%" display="flex">
          <VStack width="100%" alignItems="left" spacing="0">
            <HStack m={0} p={0} spacing={'inherit'}>
              <Tooltip placement="top" hasArrow label={'Marker'}>
                <Button
                  onClick={() => setPrimaryActionMode('pen')}
                  size="sm"
                  mr="2"
                  colorScheme={primaryActionMode === 'pen' ? 'green' : 'gray'}
                >
                  <BsPencilFill />
                </Button>
              </Tooltip>

              <Tooltip placement="top" hasArrow label={'Eraser'}>
                <Button
                  onClick={() => setPrimaryActionMode('eraser')}
                  size="sm"
                  mr="2"
                  colorScheme={primaryActionMode === 'eraser' ? 'green' : 'gray'}
                >
                  <BsEraserFill />
                </Button>
              </Tooltip>

              <ColorPicker selectedColor={markerColor} onChange={handleColorChange} size="sm"></ColorPicker>

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

              <Tooltip placement="top" hasArrow openDelay={1600} label="Screenshot in SAGE3 client (maximize your window for high-quality)">
                <Button onClick={screenshot} ml="2" size="sm" isDisabled={!isElectron()}>
                  <FaCamera />
                </Button>
              </Tooltip>
            </HStack>
            <HStack mt={4} mb={0} p={0} pr={2} spacing={'4'} w={'100%'}>
              <Text>Opacity</Text>
              <Slider
                defaultValue={markerOpacity}
                min={0.1}
                max={1}
                step={0.1}
                size={'md'}
                onChangeEnd={(v) => setMarkerOpacity(v)}
                onChange={(v) => setSliderValue1(v)}
                onMouseEnter={() => setShowTooltip1(true)}
                onMouseLeave={() => setShowTooltip1(false)}
              >
                <SliderTrack bg={sliderBackground}>
                  <Box position="relative" right={10} />
                  <SliderFilledTrack bg={sliderColor} />
                </SliderTrack>
                <Tooltip hasArrow bg="teal.500" color="white" placement="bottom" isOpen={showTooltip1} label={`${sliderValue1}`}>
                  <SliderThumb boxSize={4}>
                    <Box color={thumbColor} as={MdGraphicEq} />
                  </SliderThumb>
                </Tooltip>
              </Slider>
              <Text> Width</Text>
              <Slider
                defaultValue={markerSize}
                min={1}
                max={80}
                step={1}
                size={'md'}
                onChangeEnd={(v) => setMarkerSize(v)}
                onChange={(v) => setSliderValue2(v)}
                onMouseEnter={() => setShowTooltip2(true)}
                onMouseLeave={() => setShowTooltip2(false)}
              >
                <SliderTrack bg={sliderBackground}>
                  <Box position="relative" right={10} />
                  <SliderFilledTrack bg={sliderColor} />
                </SliderTrack>
                <Tooltip hasArrow bg="teal.500" color="white" placement="bottom" isOpen={showTooltip2} label={`${sliderValue2}`}>
                  <SliderThumb boxSize={4}>
                    <Box color={thumbColor} as={MdGraphicEq} />
                  </SliderThumb>
                </Tooltip>
              </Slider>
            </HStack>
            {/* <Text fontSize={'xs'} alignSelf={'center'} mt={'3px'}>
              While drawing, use the arrow keys or spacebar+mouse to navigate
            </Text> */}
          </VStack>
        </Box>
      </Panel>
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
      />
    </>
  );
}
