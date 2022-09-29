/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export function BoardClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
