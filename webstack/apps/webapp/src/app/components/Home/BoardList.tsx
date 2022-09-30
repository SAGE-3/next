/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Box, Button, Input, InputGroup, InputRightElement, Text, Tooltip, useColorModeValue, useToast } from '@chakra-ui/react';

import { MdSearch } from 'react-icons/md';

import { SBDocument } from '@sage3/sagebase';
import { BoardCard, CreateBoardModal, useBoardStore, usePresenceStore, useAuth } from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

type BoardListProps = {
  onBoardClick: (board: Board) => void;
  selectedRoom: Room | undefined;
  selectedBoard: Board | undefined;
};

/**
 * Board list component
 *
 * @export
 * @param {BoardListProps} props
 * @returns
 */
export function BoardList(props: BoardListProps) {
  // Data stores
  const boards = useBoardStore((state) => state.boards);
  const deleteBoard = useBoardStore((state) => state.delete);
  const subByRoomId = useBoardStore((state) => state.subscribeByRoomId);
  const storeError = useBoardStore((state) => state.error);
  const clearError = useBoardStore((state) => state.clearError);
  const presences = usePresenceStore((state) => state.presences);

  const [newBoardModal, setNewBoardModal] = useState(false);
  const [filterBoards, setFilterBoards] = useState<Board[] | null>(null);
  const [search, setSearch] = useState('');
  const { auth } = useAuth();

  // UI elements
  const toast = useToast();

  useEffect(() => {
    if (storeError) {
      // Display a message
      toast({ description: 'Error - ' + storeError, duration: 3000, isClosable: true });
      // Clear the error
      clearError();
    }
  }, [storeError]);

  useEffect(() => {
    setFilterBoards(null);
    setSearch('');
    if (props.selectedRoom) {
      subByRoomId(props.selectedRoom._id);
    }
  }, [props.selectedRoom, subByRoomId]);

  const borderColor = useColorModeValue('#718096', '#A0AEC0');

  // Filter boards with the search string
  function handleFilterBoards(event: any) {
    setSearch(event.target.value);
    const filBoards = boards.filter((board) => board.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    setFilterBoards(filBoards);
    if (event.target.value === '') {
      setFilterBoards(null);
    }
  }

  const [scrollPos, setScrollPos] = useState(0);
  const handleScrollEvent = (e: any) => {
    console.log(e.deltaY, scrollPos);
    if (e.deltaY > 0) {
      setScrollPos(Math.min(0, scrollPos + 30));
    } else {
      setScrollPos(scrollPos - 30);
    }
  };
  return (
    <Box
      height="100%"
      borderColor="gray.500"
      borderWidth="3px"
      borderRadius="md"
      backgroundColor="gray.700"
      boxShadow="xl"
      p="4"
      overflow="hidden"
    >
      {' '}
      <InputGroup>
        <Input
          my="2"
          value={search}
          onChange={handleFilterBoards}
          placeholder="Search Boards..."
          _placeholder={{ opacity: 1, color: 'gray.600' }}
        />
        <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
      </InputGroup>
      {props.selectedRoom ? (
        <Tooltip label="Create a board" placement="top" openDelay={400}>
          <Button
            height="60px"
            width="100%"
            borderRadius="md"
            border={`solid ${borderColor} 2px`}
            fontSize="48px"
            p="0"
            disabled={auth?.provider === 'guest'}
            onClick={() => setNewBoardModal(true)}
          >
            <Text fontSize="4xl" fontWeight="bold" transform={'translateY(-3px)'}>
              +
            </Text>
          </Button>
        </Tooltip>
      ) : null}
      <Box overflow="hidden" height="100%" mt="2" borderTop="solid gray 2px" onWheel={handleScrollEvent}>
        <Box transform={`translateY(${scrollPos + 'px'})`} transition="transform 0.2s">
          {props.selectedRoom
            ? (filterBoards ? filterBoards : boards)
                // sort by name
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                // create the cards
                .map((board) => {
                  return (
                    <BoardCard
                      key={board._id}
                      board={board}
                      selected={props.selectedBoard?._id == board._id}
                      userCount={presences.filter((presence) => presence.data.boardId === board._id).length}
                      onSelect={() => props.onBoardClick(board)}
                      onDelete={() => deleteBoard(board._id)}
                    />
                  );
                })
            : null}
        </Box>{' '}
      </Box>{' '}
      {props.selectedRoom ? (
        <CreateBoardModal roomId={props.selectedRoom._id} isOpen={newBoardModal} onClose={() => setNewBoardModal(false)}></CreateBoardModal>
      ) : null}
    </Box>
  );
}
