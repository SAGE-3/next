/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { CSSProperties, useEffect, useState } from 'react';
import { Box, Text, useColorModeValue, Tooltip, IconButton, useDisclosure } from '@chakra-ui/react';
import { MdHelpOutline, MdNetworkCheck, MdSearch } from 'react-icons/md';

import { HelpModal, useHexColor, useNetworkState, Alfred } from '@sage3/frontend';
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

  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

  // Alfred modal
  const { isOpen: alfredIsOpen, onOpen: alfredOnOpen, onClose: alfredOnClose } = useDisclosure();

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

  const handleHelpOpen = () => {
    helpOnOpen();
  };

  const handleAlfredOpen = () => {
    alfredOnOpen();
  };

  return (
    <Box
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

      {isBoard && (
        <Tooltip label={'Search'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            m={0}
            justifyContent="center"
            aria-label={'Network status'}
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
      {isBoard && (
        <Tooltip label={'Help'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
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
        <Tooltip label={'Help'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            pb={'1px'}
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

      {isBoard && (
        <Tooltip label={'Network status: ' + netlabel} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButton
            borderRadius="md"
            h="auto"
            p={0}
            m={0}
            fontSize="lg"
            justifyContent="center"
            aria-label={'Network status'}
            icon={<MdNetworkCheck size="24px" color={netcolor} />}
            background={'transparent'}
            color={netcolor}
            transition={'all 0.2s'}
            opacity={0.75}
            variant="ghost"
            // onClick={props.onClick}
            isDisabled={false}
            _hover={{ color: netcolor, opacity: 1, transform: 'scale(1.15)' }}
          />
        </Tooltip>
      )}

      <Text fontSize={'lg'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap">
        {time}
      </Text>
    </Box>
  );
}
