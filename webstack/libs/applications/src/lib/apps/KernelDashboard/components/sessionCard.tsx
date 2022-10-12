import React, { useState } from 'react';

// Components
import { Box, Button, Collapse, Flex, Icon, IconButton, Stack, Text, useColorModeValue } from '@chakra-ui/react';
import { Session } from '../index';

const SessionCard = (session: Session) => {

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box bg={useColorModeValue('#EEE', '#333')}>
      <Flex p={1} bg="cardHeaderBg" align="center" justify="space-between" shadow="sm" cursor="pointer">
        <Box>
          <IconButton
            variant="ghost"
            mr={1}
            fill="yellow.400"
            aria-label={''}
          />
          {session.name}
        </Box>
        <Flex alignItems="center">
          <Text color={'red'} fontWeight="bold">
            Busy
          </Text>
          <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} fill="white" mx={2} />
        </Flex>
      </Flex>
      <Collapse>
      </Collapse>
    </Box>
  );
};

export default SessionCard;
