/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { ChangeEvent, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  GridItem,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  SimpleGrid,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import { MdAdd, MdSearch, MdSort } from 'react-icons/md';

import { BoardCard, CreateBoardModal, useBoardStore, usePresenceStore, useAuth } from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

type BoardListProps = {
  onBoardClick: (board: Board) => void;
  onBackClick: () => void;
  selectedRoom: Room | undefined;
  boards: Board[];
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
  const borderColor = useColorModeValue('gray.300', 'gray.500');

  const [sortBy, setSortBy] = useState<'Name' | 'Updated' | 'Created'>('Name');

  function sortByName(a: Board, b: Board) {
    return a.data.name.localeCompare(b.data.name);
  }

  function sortByUpdated(a: Board, b: Board) {
    return a._updatedAt > b._updatedAt ? -1 : 1;
  }

  function sortByCreated(a: Board, b: Board) {
    return a._createdAt > b._createdAt ? -1 : 1;
  }

  let sortFunction = sortByName;
  if (sortBy === 'Updated') sortFunction = sortByUpdated;
  if (sortBy === 'Created') sortFunction = sortByCreated;

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as any);
  };

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

  // Filter boards with the search string
  function handleFilterBoards(event: any) {
    setSearch(event.target.value);
    const filBoards = props.boards.filter((board) => board.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    setFilterBoards(filBoards);
    if (event.target.value === '') {
      setFilterBoards(null);
    }
  }

  const [scrollPos, setScrollPos] = useState(0);
  const handleScrollEvent = (e: any) => {
    console.log(e.deltaY, scrollPos);
    if (e.deltaY > 0) {
      setScrollPos(scrollPos + 30);
    } else {
      setScrollPos(Math.min(0, scrollPos - 30));
    }
  };
  return (
    <Box m="4" mt="0" pt="1" borderTop="solid 1px" borderColor={borderColor}>
      <Box textAlign="center" display="flex" flexDir="column" justifyContent="space-between" height="100%">
        {props.selectedRoom ? (
          <CreateBoardModal
            roomId={props.selectedRoom._id}
            isOpen={newBoardModal}
            onClose={() => setNewBoardModal(false)}
          ></CreateBoardModal>
        ) : null}
        <Box display="flex" justifyContent={'space-between'}>
          <Box flexGrow={1} mr="4" display="flex" alignItems={'baseline'}>
            <Box>
              <Tooltip label="Create a New Board" placement="top" hasArrow={true} openDelay={400}>
                <Button borderRadius="md" fontSize="3xl" disabled={auth?.provider === 'guest'} onClick={() => setNewBoardModal(true)}>
                  <MdAdd />
                </Button>
              </Tooltip>
            </Box>
            <Box flexGrow={1} ml="4">
              <InputGroup>
                <Input
                  my="2"
                  value={search}
                  variant="outline"
                  onChange={handleFilterBoards}
                  placeholder="Search Boards..."
                  _placeholder={{ opacity: 1 }}
                  color="white"
                />
                <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
              </InputGroup>
            </Box>
          </Box>
          <Box>
            <Box mr="4">
              <InputGroup>
                <Select mt="2" onChange={handleSortChange} icon={<MdSort />}>
                  <option value="Name"> Name</option>
                  <option value="Updated">Updated</option>
                  <option value="Created">Created</option>
                </Select>
              </InputGroup>
            </Box>
          </Box>
        </Box>
        {/* Top Bar */}
        <Box textAlign="center" display="flex" alignItems="center" justifyContent="space-between" width="100%" mb="2"></Box>

        {/* Boards Area */}
        <Box>
          <SimpleGrid minChildWidth="300px" spacingX={6} spacingY={3}>
            {(filterBoards ? filterBoards : props.boards)

              .sort(sortFunction)
              // create the cards
              .map((board) => {
                return (
                  <BoardCard
                    key={board._id}
                    board={board}
                    userCount={presences.filter((presence) => presence.data.boardId === board._id).length}
                    onSelect={() => props.onBoardClick(board)}
                    onDelete={() => deleteBoard(board._id)}
                  />
                );
              })}
          </SimpleGrid>
        </Box>
      </Box>

      {/* Bottom Area */}
    </Box>
  );
}
