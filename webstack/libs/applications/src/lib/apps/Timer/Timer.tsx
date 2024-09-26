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

import { useAppStore, zeroPad, serverTime } from '@sage3/frontend';

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
  update(props._id, { size: { 'width': 900, 'height': 510, 'depth': 0 } });

  // Local state for timer control
  const [total, setTotal] = useState<number>(s.total); // in seconds
  const [intervalId, setIntervalId] = useState<number | null>(null);

  useEffect(() => {
    // Sync local state across clients when users manually adjust time (inc/dec/reset)
    if (s.total !== total && !s.isRunning) {
      setTotal(s.total);
    }
  }, [s.total, s.isRunning]);

  useEffect(() => {
    // Manages the countdown of the timer, starting or stopping based on the running state
    if (s.isRunning) {
      const id = window.setInterval(async () => {
        const currentTime = await serverTime();
        const localTime = Math.floor(currentTime.epoch / 1000);
        const elapsedTime = localTime - s.clientStartTime;
        const remainingTime = total - elapsedTime;
        setTotal(remainingTime);
      }, 1000);

      setIntervalId(id);
    } else {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    }
  }, [s.isRunning]);

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  // Format time as hh:mm:ss
  const formatTime = (param: number) => {
    // Determine the sign and work with the absolute value for calculation
    // const isNegative = param < 0;
    const absSeconds = Math.abs(param);

    // Calculate hours, minutes, and seconds
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = absSeconds % 60;

    // Format the time components to always have two digits
    const formattedHours = zeroPad(hours, 2);
    const formattedMinutes = zeroPad(minutes, 2);
    const formattedSeconds = zeroPad(seconds, 2);

    // Construct the formatted time string
    const timeStr = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

    // Add a negative sign if the time is negative
    return timeStr;
  };

  // Increment or decrement the time by the given amount
  const adjustTotal = (amount: number) => {
    updateState(props._id, { total: total + amount})
    updateState(props._id, { originalTotal: total + amount})
  };

  // Updates global states
  const setTimerRunning = async () => {
    const time = await serverTime();
    const inSeconds = Math.floor(time.epoch / 1000); // divide by 1000 to convert to seconds
    updateState(props._id, { clientStartTime: inSeconds });
    updateState(props._id, { total: total });
    updateState(props._id, { isRunning: !s.isRunning });
  };

  // Reset timer to 5 minutes
  const resetTimer = () => {
    updateState(props._id, { isRunning: false });
    updateState(props._id, { total: s.originalTotal });
    if (intervalId) {
      window.clearInterval(intervalId);
    }
  };

  return (
    <AppWindow app={props} disableResize={true}>
      <>
        <Text fontFamily={"monospace"} letterSpacing={-18} fontSize="200px" align="center" lineHeight="1.2"
          color={total > -1 ? total < 60 ? "orange.600" : "green.600" : "red.600"}
          animation={(total < 0) && s.isRunning ? `scaleAnimation infinite 1s linear` : 'none'}
        >
          {formatTime(total)}
        </Text>

        <VStack>
          <HStack display="flex" textAlign="center" spacing="15px">
            <Box w="162px"><Text fontSize="3xl" display="inline">Hour</Text></Box>
            <Box w="162px"><Text fontSize="3xl" display="inline">Minute</Text></Box>
            <Box w="162px"><Text fontSize="3xl" display="inline">Second</Text></Box>
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
