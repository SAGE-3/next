/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import {
  Button, Input, InputGroup, InputRightElement,
  Text, Tooltip, useColorModeValue, useToast
} from '@chakra-ui/react';

import { MdSearch } from 'react-icons/md';

import { SBDocument } from '@sage3/sagebase';
import { BoardCard, CreateBoardModal, useBoardStore, usePresenceStore } from '@sage3/frontend';
import { BoardSchema, RoomSchema } from '@sage3/shared/types';

type BoardListProps = {
  onBoardClick: (board: SBDocument<BoardSchema>) => void;
  onEnterClick: (board: SBDocument<BoardSchema>) => void;
  selectedRoom: SBDocument<RoomSchema> | null;
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
  const [filterBoards, setFilterBoards] = useState<SBDocument<BoardSchema>[] | null>(null);
  const [search, setSearch] = useState('');

  // UI elements
  const toast = useToast();

  useEffect(() => {
    if (storeError) {
      // Display a message
      toast({ description: 'Error> ' + storeError, duration: 3000, isClosable: true });
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

  function handleFilterBoards(event: any) {
    setSearch(event.target.value);
    const filBoards = boards.filter((board) => board.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    setFilterBoards(filBoards);
    if (event.target.value === '') {
      setFilterBoards(null);
    }
  }

  return (
    <>
      <InputGroup>
        <Input my="2" value={search} onChange={handleFilterBoards}
          placeholder="Search Boards..." _placeholder={{ opacity: 1, color: 'gray.600' }}
        />
        <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
      </InputGroup>

      {props.selectedRoom
        ? (filterBoards ? filterBoards : boards)
          .sort((a, b) => a.data.name.localeCompare(b.data.name))
          .map((board) => {
            return (
              <BoardCard
                key={board._id}
                board={board}
                userCount={presences.filter((presence) => presence.data.boardId === board._id).length}
                onSelect={() => props.onBoardClick(board)}
                onEdit={() => {
                  console.log('edit board');
                }}
                onEnter={() => props.onEnterClick(board)}
                onDelete={() => deleteBoard(board._id)}
              />
            );
          })
        : null}
      {props.selectedRoom ? (
        <Tooltip label="Create a board" openDelay={400}>
          <Button
            border={`solid ${borderColor} 2px`}
            borderColor={borderColor}
            my="2"
            height="60px"
            transition="transform .1s"
            _hover={{ transform: 'scale(1.1)' }}
            onClick={() => setNewBoardModal(true)}
          >
            <Text fontSize="4xl" fontWeight="bold" transform={`translateY(-3px)`}>
              +
            </Text>
          </Button>
        </Tooltip>
      ) : null}
      {props.selectedRoom ? (
        <CreateBoardModal roomId={props.selectedRoom._id} isOpen={newBoardModal} onClose={() => setNewBoardModal(false)}></CreateBoardModal>
      ) : null}
    </>
  );
}
