/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ChangeEvent, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  SimpleGrid,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';

import { MdAdd, MdSearch, MdSort } from 'react-icons/md';

import { BoardCard, CreateBoardModal, useBoardStore, usePresenceStore, useAuth, useUser } from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

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
  const subByRoomId = useBoardStore((state) => state.subscribeByRoomId);
  const storeError = useBoardStore((state) => state.error);
  const clearError = useBoardStore((state) => state.clearError);
  const presences = usePresenceStore((state) => state.partialPrescences);

  // Create board dialog
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [filterBoards, setFilterBoards] = useState<Board[] | null>(null);
  const [search, setSearch] = useState('');

  // Abilities
  const { user } = useUser();
  const canCreateBoards = SAGE3Ability.can(user?.data.userRole, 'create', 'boards');

  // UI elements
  const borderColor = useColorModeValue('gray.300', 'gray.500');

  const [sortBy, setSortBy] = useState<'Name' | 'Users' | 'Created'>('Name');

  function sortByName(a: Board, b: Board) {
    return a.data.name.localeCompare(b.data.name);
  }

  function sortByUsers(a: Board, b: Board) {
    const aUsers = presences.filter((p) => p.data.boardId === a._id).length;
    const bUsers = presences.filter((p) => p.data.boardId === b._id).length;
    return bUsers - aUsers;
  }

  function sortByCreated(a: Board, b: Board) {
    return a._createdAt > b._createdAt ? -1 : 1;
  }

  let sortFunction = sortByName;
  if (sortBy === 'Users') sortFunction = sortByUsers;
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
    const filBoards = props.boards.filter(
      (board) =>
        // search board name
        board.data.name.toLowerCase().includes(event.target.value.toLowerCase()) ||
        // search description
        board.data.description.toLowerCase().includes(event.target.value.toLowerCase())
    );
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
          <CreateBoardModal roomId={props.selectedRoom._id} isOpen={isOpen} onClose={onClose}></CreateBoardModal>
        ) : null}
        <Box display="flex" justifyContent={'space-between'}>
          <Box flexGrow={1} mr="4" display="flex" alignItems={'center'}>
            <Box>
              <Tooltip label="Create a New Board" placement="top" hasArrow={true} openDelay={400}>
                <Button aria-label="create a board" borderRadius="md" fontSize="3xl" isDisabled={!canCreateBoards} onClick={onOpen}>
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
                  placeholder="Find Board..."
                  _placeholder={{ opacity: 1 }}
                  name="findBoard"
                />
                <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
              </InputGroup>
            </Box>
          </Box>
          <Box>
            <Box mr="4">
              <InputGroup>
                <Select name="sortBoard" mt="2" onChange={handleSortChange} icon={<MdSort />}>
                  <option value="Name"> Name</option>
                  <option value="Users">Users</option>
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
