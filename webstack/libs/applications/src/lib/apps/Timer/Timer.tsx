/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';

import { Box, Button, ButtonGroup, Text, Tooltip, HStack, VStack } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdPlayArrow, MdPause, MdReplay } from 'react-icons/md';

import { useAppStore } from '@sage3/frontend';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

/* App component for Timer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);

  // Set size for the app
  update(props._id, { size: { 'width': 1250, 'height': 670, 'depth': 0 } });

  // Local state for timer control
  const [total, setTotal] = useState<number>(s.total); // in seconds
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update global state when local state changes
    updateState(props._id, { total: total });
  }, [total]);

  useEffect(() => {
    // Sync local state across clients when users manually adjust time (inc/dec/reset)
    if (s.total !== total && !s.isRunning) {
      setTotal(s.total);
    }
  }, [s.total]);
  
  useEffect(() => {
    // Manages the countdown of the timer, starting or stopping based on the running state
    if (s.isRunning) {
      const id = setInterval(() => {
        setTotal((prevTotal) => prevTotal - 1 );
      }, 1000);

      setIntervalId(id);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  }, [s.isRunning]);
  
  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  // Format time as hh:mm:ss
  const formatTime = (seconds: number): string => {
    // Determine the sign and work with the absolute value for calculation
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);

    // Calculate hours, minutes, and seconds
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;

    // Format the time components to always have two digits
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = secs.toString().padStart(2, '0');

    // Construct the formatted time string
    const timeStr = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

    console.log('global ', s.total);
    console.log('local ', total);
    // Add a negative sign if the time is negative
    return isNegative ? `-${timeStr}` : timeStr;
  };

  // Increment or decrement the time by the given amount
  const adjustTotal = (amount: number) => {
    setTotal(total + amount);
  };

  // Updates the global running state of the timer
  const setTimerRunning = () => {
    updateState(props._id, { isRunning: !s.isRunning });
  };

  // Reset timer to 5 minutes
  const resetTimer = () => {
    updateState(props._id, { isRunning: false });
    if (intervalId) {
      clearInterval(intervalId);
    }
    setTotal(300);
  };

  return (
    <AppWindow app={props} disableResize={true}>
      <>
        <Text fontSize="300px" align="center" lineHeight="1.2" color={total > -1 ? "default" : "red"}>{formatTime(s.total)}</Text>

        <VStack>
          <HStack display="flex" textAlign="center" spacing="15px">
            <Box w="162px"><Text fontSize="xl" display="inline">Hour</Text></Box>
            <Box w="162px"><Text fontSize="xl" display="inline">Minute</Text></Box>
            <Box w="162px"><Text fontSize="xl" display="inline">Second</Text></Box>
          </HStack>
          <Box display="flex" justifyContent="center">
            <ButtonGroup isAttached colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label={'+1 Hour'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={() => adjustTotal(3600)}>
                  <MdAdd />
                </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'-1 Hour'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={() => adjustTotal(-3600)}>
                  <MdRemove />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Text fontSize="5xl" display="inline" px="3px">:</Text>

            <ButtonGroup isAttached size="lg" colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label={'+1 Minute'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={() => adjustTotal(60)}>
                  <MdAdd />
                </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'-1 Minute'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={() => adjustTotal(-60)}>
                  <MdRemove />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Text fontSize="5xl" display="inline" px="3px">:</Text>

            <ButtonGroup isAttached size="lg" colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label={'+1 Second'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={() => adjustTotal(1)}>
                  <MdAdd />
                </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'-1 Second'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={() => adjustTotal(-1)}>
                  <MdRemove />
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>
          
          <Box display="flex" justifyContent="center" w="512px" mt={5}>
            <Tooltip placement="bottom" hasArrow={true} label={s.isRunning ? 'Pause' : 'Start'} openDelay={400}>
              <Button w="50%" h="80px" fontSize="40px" colorScheme="orange" onClick={setTimerRunning}>{s.isRunning ? <MdPause /> : <MdPlayArrow />}</Button>
            </Tooltip>
            <Tooltip placement="bottom" hasArrow={true} label={'Reset'} openDelay={400}>
              <Button w="50%" h="80px" fontSize="40px" ml={3} colorScheme="orange" onClick={resetTimer}><MdReplay /></Button>
            </Tooltip>
          </Box>
        </VStack>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Timer */
function ToolbarComponent(props: App): JSX.Element {
  return (
    <>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
