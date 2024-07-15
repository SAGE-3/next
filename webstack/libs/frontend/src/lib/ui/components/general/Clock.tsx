/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { CSSProperties, useEffect, useState } from 'react';
import { Box, Text, useColorModeValue, Tooltip, IconButton, useDisclosure } from '@chakra-ui/react';
import { MdHelpOutline, MdNetworkCheck, MdRemoveRedEye, MdSearch } from 'react-icons/md';
import { PiGaugeBold } from 'react-icons/pi';

import {
  HelpModal,
  useHexColor,
  useNetworkState,
  Alfred,
  EditVisibilityModal,
  useUserSettings,
  usePressureObserver,
  PressureState,
} from '@sage3/frontend';
import { useParams } from 'react-router';

type ClockProps = {
  style?: CSSProperties;
  opacity?: number;
  isBoard?: boolean;
  homeHelpClick?: () => void;
};

// A digital Clock
export function Clock(props: ClockProps) {
  const isBoard = props.isBoard ? props.isBoard : false;

  const { settings } = useUserSettings();
  const showUI = settings.showUI;

  const { boardId, roomId } = useParams();

  // State of the current time
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Colors
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const backgroundColor = useColorModeValue('#ffffff69', '#22222269');
  const tealColorMode = useColorModeValue('teal.500', 'teal.200');
  const teal = useHexColor(tealColorMode);

  // Network Status Colors
  const onlineColor = useHexColor('green.600');
  const midtierColor = useHexColor('yellow.300');
  const lowtierColor = useHexColor('orange.400');
  const offlineColor = useHexColor('red.500');

  // Network Status
  const networkStatus = useNetworkState();
  const [netcolor, setNetcolor] = useState(onlineColor);
  const [netlabel, setNetlabel] = useState('online');

  // Pressure Observer
  const pressure = usePressureObserver();
  const [cpucolor, setCPUcolor] = useState(onlineColor);
  const [cpulabel, setCPUlabel] = useState('nominal');

  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

  // Alfred modal
  const { isOpen: alfredIsOpen, onOpen: alfredOnOpen, onClose: alfredOnClose } = useDisclosure();

  // Presence settings modal
  const { isOpen: visibilityIsOpen, onOpen: visibilityOnOpen, onClose: visibilityOnClose } = useDisclosure();

  // Update the time on an interval every 30secs
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (networkStatus) {
      if (networkStatus.online) {
        setNetcolor(onlineColor);
        setNetlabel('online');
        if (networkStatus.effectiveType === '3g') {
          setNetcolor(midtierColor);
          setNetlabel('mid-tier mobile');
        }
        if (networkStatus.effectiveType === '2g') {
          setNetcolor(lowtierColor);
          setNetlabel('low-tier mobile');
        }
      } else {
        setNetcolor(offlineColor);
        setNetlabel('offline');
      }
    }
  }, [networkStatus]);

  useEffect(() => {
    if (pressure) {
      if (pressure.state === PressureState.nominal) {
        setCPUcolor(onlineColor);
      } else if (pressure.state === PressureState.fair) {
        setCPUcolor(midtierColor);
      } else if (pressure.state === PressureState.serious) {
        setCPUcolor(lowtierColor);
      } else if (pressure.state === PressureState.critical) {
        setCPUcolor(offlineColor);
      }
      setCPUlabel(pressure.state.toString());
    }
  }, [pressure]);

  const handleHelpOpen = () => {
    helpOnOpen();
  };

  const handleAlfredOpen = () => {
    alfredOnOpen();
  };

  const handlePresenceSettingsOpen = () => {
    visibilityOnOpen();
  };

  return (
    <Box
      sx={{ '-webkit-app-region': 'no-drag' }}
      borderRadius="md"
      backgroundColor={backgroundColor}
      whiteSpace={'nowrap'}
      width="100%"
      display="flex"
      pr={2}
      pl={1}
      justifyContent="right"
      alignItems={'center'}
    >
      {/* Help Modal */}
      {isBoard && <HelpModal onClose={helpOnClose} isOpen={helpIsOpen}></HelpModal>}
      {/* Alfred modal dialog */}
      {isBoard && boardId && roomId && <Alfred boardId={boardId} roomId={roomId} isOpen={alfredIsOpen} onClose={alfredOnClose} />}

      {/* Presence settings modal dialog */}
      {isBoard && <EditVisibilityModal isOpen={visibilityIsOpen} onClose={visibilityOnClose} />}

      {isBoard && (
        <Tooltip label={'Visibility'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            mr={-2}
            justifyContent="center"
            aria-label={'Presence'}
            icon={<MdRemoveRedEye size="24px" />}
            background={'transparent'}
            colorScheme="gray"
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            onClick={handlePresenceSettingsOpen}
            isDisabled={false}
            _hover={{ color: teal, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}

      {isBoard && showUI && (
        <Tooltip label={'Search'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            m={0}
            justifyContent="center"
            aria-label={'Search'}
            icon={<MdSearch size="22px" />}
            background={'transparent'}
            colorScheme="gray"
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            onClick={handleAlfredOpen}
            isDisabled={false}
            _hover={{ color: teal, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}
      {isBoard && showUI && (
        <Tooltip label={'UI Cheatsheet'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            m={-2}
            justifyContent="center"
            aria-label={'Network status'}
            icon={<MdHelpOutline size="22px" />}
            background={'transparent'}
            colorScheme="gray"
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            onClick={handleHelpOpen}
            isDisabled={false}
            _hover={{ color: teal, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}

      {!isBoard && (
        <Tooltip label={'Restart the guided tour'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            pb={'1px'}
            mr="-1"
            justifyContent="center"
            aria-label={'Network status'}
            icon={<MdHelpOutline size="22px" />}
            background={'transparent'}
            colorScheme="gray"
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            onClick={props.homeHelpClick}
            isDisabled={false}
            _hover={{ color: teal, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}

      {isBoard && showUI && (
        <Tooltip label={'Network status: ' + netlabel} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            mr={-2}
            fontSize="lg"
            justifyContent="center"
            aria-label={'Network status'}
            icon={<MdNetworkCheck size="24px" color={netcolor} />}
            background={'transparent'}
            color={netcolor}
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            isDisabled={false}
            _hover={{ color: netcolor, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}

      {isBoard && showUI && (
        <Tooltip label={'CPU load: ' + cpulabel} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            m={0}
            fontSize="lg"
            justifyContent="center"
            aria-label={'CPU pressure'}
            icon={<PiGaugeBold size="24px" color={cpucolor} />}
            background={'transparent'}
            color={cpucolor}
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            isDisabled={false}
            _hover={{ color: cpucolor, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}

      {isBoard && showUI && (
        <Text fontSize={'lg'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap">
          {time}
        </Text>
      )}

      {!isBoard && (
        <Text fontSize={'lg'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap">
          {time}
        </Text>
      )}
    </Box>
  );
}
