import { useDisclosure, useToast } from '@chakra-ui/react';
import { Board } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EnterBoardModal } from '../ui';

/**
 * Checks the url for a board id and stores it in local storage for the JoinBoardCheck component to check for later.
 * @returns
 */
export const CheckUrlForBoardId = () => {
  let { boardId } = useParams();
  if (boardId) {
    localStorage.setItem('boardId', boardId);
  } else {
    localStorage.removeItem('boardId');
  }
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/home', { replace: true });
  }, []);

  return null;
};

/**
 * Checks local storage for a boardId and if it exists, it will open a modal to enter the board
 * @returns
 */
export function JoinBoardCheck() {
  // To handle the user entering a url containing the boardId
  const boardId = localStorage.getItem('boardId');
  localStorage.removeItem('boardId');
  const [boardByUrl, setBoardByUrl] = useState<Board>();
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();
  const toast = useToast();
  // Enter a board if the url contains it
  useEffect(() => {
    async function joinBoard() {
      const res = await fetch(`/api/boards/${boardId}`);
      const resjson = await res.json();
      if (resjson.success) {
        const board = resjson.data[0] as Board;
        setBoardByUrl(board);
        onOpenEnterBoard();
      } else {
        toast({
          title: 'Board not found',
          description: `Sorry, we couldn't find a board with the id "${boardId}"`,
          duration: 3000,
          isClosable: true,
          status: 'error',
        });
      }
    }
    if (boardId) {
      joinBoard();
    }
  }, []);

  return (
    <>
      {boardByUrl !== undefined ? (
        <EnterBoardModal board={boardByUrl} isOpen={isOpenEnterBoard} onClose={onCloseEnterBoard}></EnterBoardModal>
      ) : null}
    </>
  );
}
