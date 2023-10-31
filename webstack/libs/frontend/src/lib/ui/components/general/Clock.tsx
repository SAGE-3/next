/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { CSSProperties, useEffect, useState } from 'react';
import { Box, Text, useColorModeValue, Tooltip, IconButton } from '@chakra-ui/react';
import { MdNetworkCheck } from 'react-icons/md';

import { useNetworkState } from '@sage3/frontend';

type ClockProps = {
  style?: CSSProperties;
  opacity?: number;
  isBoard?: boolean;
};

// A digital Clock
export function Clock(props: ClockProps) {
  const isBoard = props.isBoard ? props.isBoard : false;

  // State of the current time
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Colors
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const backgroundColor = useColorModeValue('#ffffff69', '#22222269');

  // Network Status
  const networkStatus = useNetworkState();
  const [netcolor, setNetcolor] = useState('green');
  const [netlabel, setNetlabel] = useState('online');

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
        setNetcolor('#38A169');
        setNetlabel('online');
        if (networkStatus.effectiveType === '3g') {
          setNetcolor('#F6AD55');
          setNetlabel('mid-tier mobile');
        }
        if (networkStatus.effectiveType === '2g') {
          setNetcolor('#FC8181');
          setNetlabel('low-tier mobile');
        }
      } else {
        setNetcolor('red');
        setNetlabel('offline');
      }
    }
  }, [networkStatus]);

  if (isBoard) {
    return (
      <Box
        borderRadius="md"
        backgroundColor={backgroundColor}
        whiteSpace={'nowrap'}
        width="100%"
        display="flex"
        px={2}
        justifyContent="left"
        alignItems={'center'}
      >
        <Text fontSize={'lg'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap">
          {time}
        </Text>

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
      </Box>
    );
  } else {
    return (
      <Box display="flex" style={props.style} alignItems="center" justifyContent="center">
        <Text fontSize={'xl'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap">
          {time}
        </Text>
      </Box>
    );
  }
}
