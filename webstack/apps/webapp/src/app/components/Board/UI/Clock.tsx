/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

// The Board's Clock
export function Clock() {
  // State of the current time
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Update the time on an interval every 30secs
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show the clock in the upper right hand corner
  return (
    <Box
      display="flex"
      position={'absolute'}
      top={'0'}
      right={'0'}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      mr="2"
      mt="1"
    >
      <Text fontSize="xl" fontWeight="bold" opacity={0.7}>
        {time}
      </Text>
    </Box>
  );
}
