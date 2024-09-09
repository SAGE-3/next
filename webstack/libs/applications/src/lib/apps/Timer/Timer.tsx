/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';

import { Box, Button, ButtonGroup, Text, Tooltip, VStack } from '@chakra-ui/react';
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
  update(props._id, { size: { 'width': 1250, 'height': 630, 'depth': 0 } });

  // Local state for timer control
  const [total, setTotal] = useState<number>(s.total); // in seconds
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update global state when local state changes
    updateState(props._id, { total: total });
  }, [total]);

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);
  
  useEffect(() => {
    manageTimer();
  }, [s.isRunning]);

  // Format numbers as hh:mm:ss
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

    // Add a negative sign if the time is negative
    return isNegative ? `-${timeStr}` : timeStr;
  };

  const incrementHour = () => {
    setTotal(total + 3600);
  };

  const decrementHour = () => {
    setTotal(total - 3600);
  };

  const incrementMinute = () => {
    setTotal(total + 60);
  };

  const decrementMinute = () => {
    setTotal(total - 60);
  };

  const incrementSecond = () => {
    setTotal(total + 1);
  };

  const decrementSecond = () => {
    setTotal(total - 1);
  };
  
  // Manages the state of the timer, starting or stopping it based on the running state
  const manageTimer = () => {
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
        <Text fontSize="300px" align="center" lineHeight="1.2" color={total > -1 ? "default" : "red"}>{formatTime(total)}</Text>

        <VStack>
          <Box display="flex" justifyContent="center">
            <ButtonGroup isAttached colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label={'+1 Hour'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={incrementHour}>
                  <MdAdd />
                </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'-1 Hour'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={decrementHour}>
                  <MdRemove />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Text fontSize="5xl" display="inline" px="3px">:</Text>

            <ButtonGroup isAttached size="lg" colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label={'+1 Minute'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={incrementMinute}>
                  <MdAdd />
                </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'-1 Minute'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={decrementMinute}>
                  <MdRemove />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Text fontSize="5xl" display="inline" px="3px">:</Text>

            <ButtonGroup isAttached size="lg" colorScheme="teal">
              <Tooltip placement="bottom" hasArrow={true} label={'+1 Second'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={incrementSecond}>
                  <MdAdd />
                </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'-1 Second'} openDelay={400}>
                <Button w="80px" h="80px" fontSize="40px" isDisabled={s.isRunning} onClick={decrementSecond}>
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
