/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ReactNode, useState } from 'react';
import { Box, Divider, HStack, Text, useDisclosure, useToast } from '@chakra-ui/react';

import { PiStackFill } from 'react-icons/pi';
import { MdDashboard, MdExitToApp } from 'react-icons/md';

import { Board, Room } from '@sage3/shared/types';
import { EnterBoardModal, ConfirmModal } from '@sage3/frontend';

type SearchRowChildrenProps = {
  room?: Room;
  board?: Board & { roomName?: string };
  clickHandler?: () => void;
};

type SearchRowProps = {
  children: ReactNode;
};

interface SearchRowUrlProps extends SearchRowChildrenProps {
  urlInfo: { board: Board | null; isExternal: Boolean; error: Boolean; url: string | null };
}

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
          onOpen();
        }}
        _hover={{ cursor: 'pointer', background: 'gray.700', borderRadius: 'lg' }}
        transition="ease-in 200ms"
      >
        <Box overflow="hidden" display="flex" gap="4" alignItems="center">
          <MdDashboard fontSize="24px" />
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
          <PiStackFill fontSize="24px" />
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

SearchRow.Url = ({ urlInfo }: SearchRowUrlProps) => {
  // Local state
  const [boardUrl, setboardURL] = useState('');

  // Chakra Toast
  const toast = useToast();

  // Enter Board by ID Modal
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();
  const { isOpen: changeBoardIsOpen, onOpen: changeBoardOnOpen, onClose: changeBoardOnClose } = useDisclosure();
  const { isOpen: differentServerIsOpen, onOpen: differentServerOnOpen, onClose: differentServerOnClose } = useDisclosure();

  const differentServerConfirm = () => {
    try {
      const url = new URL((urlInfo.url as string).replace('sage3://', 'https://'));
      // Change the current address to the new url
      window.location.href = url.href;
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'This URL is invalid.',
        duration: 3000,
        isClosable: true,
        status: 'error',
      });
    }
  };

  const changeBoardConfirm = () => {
    if (urlInfo.board) {
      onOpenEnterBoard();
    }
  };

  const cancelReset = () => {
    setboardURL('');
    differentServerOnClose();
    changeBoardOnClose();
    onCloseEnterBoard();
  };

  /* Submit handler */
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (urlInfo.isExternal) {
      differentServerOnOpen();
      return;
    }

    if (urlInfo.board) {
      changeBoardOnOpen();
      return;
    }
  };

  return (
    <>
      <HStack
        w="100%"
        px="1"
        py="3"
        role="button"
        onClick={handleSubmit}
        _hover={{ cursor: 'pointer', background: 'gray.700', borderRadius: 'lg' }}
        transition="ease-in 200ms"
      >
        <Box overflow="hidden" display="flex" gap="4" alignItems="center">
          <MdExitToApp fontSize="24px" />
          <Box>
            <Text textOverflow="ellipsis" whiteSpace="nowrap" fontWeight="bold">
              {!urlInfo.isExternal ? `Join board: ${urlInfo.board?.data.name}` : 'Join board in a different hub'}
            </Text>
          </Box>
        </Box>
      </HStack>
      <Divider />

      {urlInfo.board ? (
        <EnterBoardModal isOpen={isOpenEnterBoard} onClose={onCloseEnterBoard} board={urlInfo.board}></EnterBoardModal>
      ) : null}
      <ConfirmModal
        isOpen={differentServerIsOpen}
        onClose={cancelReset}
        title={'Different Hub'}
        cancelText={'Cancel'}
        confirmText="Confirm"
        confirmColor="green"
        message={`This board exists on a different hub. Are you sure you want to leave this hub?`}
        onConfirm={differentServerConfirm}
      />

      <ConfirmModal
        isOpen={changeBoardIsOpen}
        onClose={cancelReset}
        title={'Change Board'}
        cancelText={'Cancel'}
        confirmText="Confirm"
        confirmColor="green"
        message={`Are you sure you want to enter "${urlInfo.board?.data.name}?`}
        onConfirm={changeBoardConfirm}
      />
    </>
  );
};

export default SearchRow;
