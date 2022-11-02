/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { CSSProperties, useEffect, useState } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

type ClockProps = {
  style?: CSSProperties;
  opacity?: number;
};

// A digital Clock
export function Clock(props: ClockProps) {
  // State of the current time
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const textColor = useColorModeValue('gray.800', 'gray.100');

  // Update the time on an interval every 30secs
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box display="flex" style={props.style} alignItems="center" justifyContent="center">
      <Text fontSize={'xl'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap">
        {time}
      </Text>
    </Box>
  );
}
