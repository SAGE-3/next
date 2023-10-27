/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Box, Text, useColorModeValue, useDisclosure, Button } from '@chakra-ui/react';
import { MdEdit } from 'react-icons/md';
import { Board } from '@sage3/shared/types';
import { EditBoardModal, EnterBoardModal, useHexColor, useUser, useUsersStore } from '@sage3/frontend';

type BoardCardProps = {
  board: Board | undefined;
};

export function BoardCard(props: BoardCardProps) {
  // Colors
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );
  const borderColor = useHexColor(props.board ? props.board.data.color : 'gray');

  // Users
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);
  const isOwner = props.board?.data.ownerId === user?._id;

  // UI Elements
  const title = props.board ? props.board.data.name : 'No Board Selected';
  const description = props.board ? props.board.data.description : 'No Description';
  const owner = props.board ? users.find((u) => u._id === props.board?._createdBy)?.data.name : 'No Owner';
  const createdDate = props.board ? new Date(props.board._createdAt).toDateString() : 'No Created Date';
  const updatedDate = props.board ? new Date(props.board._updatedAt).toDateString() : 'No Updated Date';

  // Disclousre for Edit Board
  const { isOpen: editIsOpen, onOpen: editOnOpen, onClose: editOnClose } = useDisclosure();

  // Enter Board
  const { isOpen: enterIsOpen, onOpen: enterOnOpen, onClose: enterOnClose } = useDisclosure();

  // Enter Board
  const handleEnterBoard = (ev: any) => {
    ev.stopPropagation();
    enterOnOpen();
  };

  return (
    <Box display="flex" flexDirection="column" borderRadius="md" height="220px" background={linearBGColor} padding="12px">
      {props.board && <EnterBoardModal board={props.board} isOpen={enterIsOpen} onClose={enterOnClose} />}
      {props.board && isOwner && (
        <EditBoardModal isOpen={editIsOpen} onOpen={editOnOpen} board={props.board} onClose={editOnClose}></EditBoardModal>
      )}
      <Box display="flex" justifyContent={'space-between'}>
        <Box mb="2" display="flex" justifyContent={'space-between'} width="100%">
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="2xl" fontWeight={'bold'}>
            {title}
          </Box>
          <Box display="flex" justifyContent={'left'} gap="8px">
            <IconButton
              size="sm"
              colorScheme="teal"
              variant={'outline'}
              aria-label="create-board"
              fontSize="xl"
              isDisabled={!isOwner}
              onClick={editOnOpen}
              icon={<MdEdit />}
            ></IconButton>
          </Box>
        </Box>
      </Box>
      <Box flex="1" display="flex" flexDir="column">
        <Box>
          {props.board && (
            <table>
              <tbody>
                <tr>
                  <td width="100px">
                    <Text fontSize="sm" fontWeight={'bold'}>
                      Description
                    </Text>
                  </td>
                  <td>
                    <Text fontSize="sm">{description}</Text>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text fontSize="sm" fontWeight={'bold'}>
                      Owner
                    </Text>
                  </td>
                  <td>
                    <Text fontSize="sm">{owner}</Text>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text fontSize="sm" fontWeight={'bold'}>
                      Created
                    </Text>
                  </td>
                  <td>
                    <Text fontSize="sm">{createdDate}</Text>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text fontSize="sm" fontWeight={'bold'}>
                      Updated
                    </Text>
                  </td>
                  <td>
                    <Text fontSize="sm">{updatedDate}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Box>
      </Box>
      {props.board && (
        <Button my="1" size="sm" variant="outline" colorScheme="teal" onClick={handleEnterBoard}>
          Enter Board
        </Button>
      )}
    </Box>
  );
}
