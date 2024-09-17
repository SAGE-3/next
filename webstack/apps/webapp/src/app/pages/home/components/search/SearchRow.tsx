/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ReactNode } from 'react';
import { Box, Divider, HStack, Text, useDisclosure } from '@chakra-ui/react';

import { BiGridAlt } from 'react-icons/bi';
import { BsFillCollectionFill } from 'react-icons/bs';

import { Board, Room } from '@sage3/shared/types';
import { EnterBoardModal } from '@sage3/frontend';

type SearchRowChildrenProps = {
  room?: Room;
  board?: Board & { roomName: string };
  clickHandler?: () => void;
};

type SearchRowProps = {
  children: ReactNode;
};

const SearchRow = ({ children }: SearchRowProps) => {
  return <>{children}</>;
};

SearchRow.Board = ({ board }: SearchRowChildrenProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <HStack
        w="100%"
        p="1"
        role="button"
        onClick={(e) => {
          e.stopPropagation();
          console.log('board', board);
          onOpen();
        }}
        _hover={{ cursor: 'pointer', background: 'gray.700', borderRadius: 'lg' }}
        transition="ease-in 200ms"
      >
        <Box overflow="hidden" display="flex" gap="4" alignItems="center">
          <BiGridAlt fontSize="24px" />
          <Box w="250px">
            <Text textOverflow="ellipsis" whiteSpace="nowrap" fontWeight="bold">
              {board?.data.name}
            </Text>
            <Text textOverflow="ellipsis" whiteSpace="nowrap" fontSize="small">
              {board?.roomName}
            </Text>
          </Box>
        </Box>
      </HStack>
      <Divider />
      <EnterBoardModal board={board as Board} isOpen={isOpen} onClose={onClose} />
    </>
  );
};

SearchRow.Room = ({ room, clickHandler }: SearchRowChildrenProps) => {
  return (
    <>
      <HStack
        w="100%"
        p="1"
        role="button"
        onClick={clickHandler}
        _hover={{ cursor: 'pointer', background: 'gray.700', borderRadius: 'lg' }}
        transition="ease-in 200ms"
      >
        <Box overflow="hidden" display="flex" gap="4" alignItems="center">
          <BsFillCollectionFill fontSize="24px" />
          <Box>
            <Text textOverflow="ellipsis" whiteSpace="nowrap" fontWeight="bold">
              {room?.data.name}
            </Text>
            <Text textOverflow="ellipsis" whiteSpace="nowrap" fontSize="small">
              {room?.data.description}
            </Text>
          </Box>
        </Box>
      </HStack>
      <Divider />
    </>
  );
};

export default SearchRow;
