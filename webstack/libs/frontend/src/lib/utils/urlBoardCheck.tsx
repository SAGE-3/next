/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useDisclosure, useToast } from '@chakra-ui/react';

import { Board } from '@sage3/shared/types';

import { useRouteNav } from '../hooks';
import { EnterBoardModal } from '../ui';
import { apiUrls } from '../config';

/**
 * Checks the url for a board id and stores it in local storage for the JoinBoardCheck component to check for later.
 * @returns
 */
export const CheckUrlForBoardId = () => {
  const { boardId } = useParams();
  if (boardId) {
    localStorage.setItem('boardId', boardId);
  } else {
    localStorage.removeItem('boardId');
  }
  const { toHome } = useRouteNav();
  useEffect(() => {
    toHome();
  }, []);

  return null;
};

/**
 * Checks local storage for a boardId and if it exists, it will open a modal to enter the board
 * @returns
 */
export function JoinBoardCheck() {
  // Routing
  const { toHome } = useRouteNav();
  // To handle the user entering a url containing the boardId
  const boardId = localStorage.getItem('boardId');
  localStorage.removeItem('boardId');

  // Board to enter and modal
  const [boardByUrl, setBoardByUrl] = useState<Board | null>(null);
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();

  // Toast for information feedback
  const toast = useToast();

  // Enter a board if the url contains it
  useEffect(() => {
    async function joinBoard(bid: string) {
      const res = await fetch(apiUrls.boards.getBoard(bid));
      const resjson = await res.json();
      if (resjson.success) {
        const board = resjson.data[0] as Board;
        setBoardByUrl(board);
        onOpenEnterBoard();
      } else {
        toast({
          title: 'Board not found',
          description: `Sorry, we could not find a board with the id "${boardId}"`,
          duration: 5000,
          isClosable: true,
          status: 'error',
        });
        toHome();
      }
    }
    if (boardId) {
      joinBoard(boardId);
    }
  }, []);

  if (boardByUrl) {
    return <EnterBoardModal board={boardByUrl} isOpen={isOpenEnterBoard} onClose={onCloseEnterBoard}></EnterBoardModal>;
  }
  return null;
}
