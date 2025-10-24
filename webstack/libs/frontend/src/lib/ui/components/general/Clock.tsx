/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { CSSProperties, useEffect, useState } from 'react';
import { Box, Text, useColorModeValue, useDisclosure } from '@chakra-ui/react';

import { EditUserSettingsModal, useUserSettings } from '@sage3/frontend';

type ClockProps = {
  opacity?: number;
  isBoard?: boolean;
  homeHelpClick?: () => void;
};

// A digital Clock
export function Clock(props: ClockProps) {
  const isBoard = props.isBoard ? props.isBoard : false;

  const { settings } = useUserSettings();
  const showUI = settings.showUI;

  // State of the current time
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Colors
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const backgroundColor = useColorModeValue('gray.100', 'gray.800');

  // Presence settings modal
  const { isOpen: editSettingsIsOpen, onClose: editSettingsOnClose } = useDisclosure();

  // Update the time on an interval every 30secs
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{ WebkitAppRegion: 'no-drag' }}
      borderRadius="md"
      backgroundColor={'transparent'}
      whiteSpace={'nowrap'}
      width="100%"
      display="flex"
      pr={1}
      pl={1}
      justifyContent="right"
      alignItems={'center'}
      background={props.isBoard ? backgroundColor : "transparent"}
    >
      {/* Edit User Settings  modal dialog */}
      {isBoard && <EditUserSettingsModal isOpen={editSettingsIsOpen} onClose={editSettingsOnClose} />}

      {isBoard && showUI && (
        <Text fontSize={'lg'} opacity={props.opacity ? props.opacity : 1.0} color={textColor} userSelect="none" whiteSpace="nowrap" mx={1}>
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
