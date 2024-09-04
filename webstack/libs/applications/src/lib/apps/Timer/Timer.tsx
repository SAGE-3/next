/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';

import { Box, Button, ButtonGroup, Text, Tooltip } from '@chakra-ui/react';
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
  const updateState = useAppStore((state) => state.updateState);

  // Set size for the app
  props.data.size.width = 500;
  props.data.size.height = 205;

  // Local state for timer control
  const [total, setTotal] = useState<number>(s.total); // in seconds
  const [isRunning, setIsRunning] = useState<boolean>(false);
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
  
  // Toggle start/stop timer
  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalId) {
        clearInterval(intervalId);
      }
    } else {
      setIsRunning(true);
      const id = setInterval(() => {
        setTotal((prevTotal) => prevTotal - 1 );
      }, 1000);
  
      setIntervalId(id);
    }
  };

  // Reset timer to 5 minutes
  const resetTimer = () => {
    setIsRunning(false);
    if (intervalId) {
      clearInterval(intervalId);
    }
    setTotal(300);
  };

  return (
    <AppWindow app={props} disableResize={true}>
      <>
        <Text fontSize="6xl" align="center" color={total > -1 ? "default" : "red"}>{formatTime(total)}</Text>

        <Box display="flex" justifyContent="center">
          <ButtonGroup isAttached size="sm" colorScheme="teal">
            <Tooltip placement="bottom" hasArrow={true} label={'+1 Hour'} openDelay={400}>
              <Button p={0} onClick={incrementHour}>
                <MdAdd />
              </Button>
            </Tooltip>
            <Tooltip placement="bottom" hasArrow={true} label={'-1 Hour'} openDelay={400}>
              <Button p={0} onClick={decrementHour}>
                <MdRemove />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <Text fontSize="xl" display="inline" px="3px">:</Text>

          <ButtonGroup isAttached size="sm" colorScheme="teal">
            <Tooltip placement="bottom" hasArrow={true} label={'+1 Minute'} openDelay={400}>
              <Button p={0} onClick={incrementMinute}>
                <MdAdd />
              </Button>
            </Tooltip>
            <Tooltip placement="bottom" hasArrow={true} label={'-1 Minute'} openDelay={400}>
              <Button p={0} onClick={decrementMinute}>
                <MdRemove />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <Text fontSize="xl" display="inline" px="3px">:</Text>

          <ButtonGroup isAttached size="sm" colorScheme="teal">
            <Tooltip placement="bottom" hasArrow={true} label={'+1 Second'} openDelay={400}>
              <Button p={0} onClick={incrementSecond}>
                <MdAdd />
              </Button>
            </Tooltip>
            <Tooltip placement="bottom" hasArrow={true} label={'-1 Second'} openDelay={400}>
              <Button p={0} onClick={decrementSecond}>
                <MdRemove />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>
        
        <Box display="flex" justifyContent="center" mt={5}>
          <Button w="45%" size="sm" p={0} colorScheme="orange" onClick={toggleTimer}>{isRunning ? <MdPause /> : <MdPlayArrow />}</Button>
          <Button w="45%" size="sm" ml={1} p={0} colorScheme="orange" onClick={resetTimer}><MdReplay /></Button>
        </Box>
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
