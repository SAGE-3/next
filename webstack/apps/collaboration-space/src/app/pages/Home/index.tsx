/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { Wrap, WrapItem, useToast, Input, InputLeftElement, InputGroup, VStack } from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';

import { BoardCard, boardInfoProps, InputCard, PageLayout } from '@sage3/frontend/components';
import { useUser, useUsers } from '@sage3/frontend/services';
import { useSocket } from '@sage3/frontend/utils/misc/socket';
import { UserSchema } from '@sage3/shared/types';

export function Home(): JSX.Element {
  const user = useUser();

  return (
    <PageLayout title={'Boards'}>
      <BoardsList user={user} />
    </PageLayout>
  );
}


function BoardsList(props: { user: UserSchema }) {
  const socket = useSocket();
  const [boardList, setBoardList] = useState<any>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const users = useUsers();
  const toast = useToast();

  document.title = 'SAGE3';

  useEffect(() => {
    // Intial data: REST API call
    axios
      .get('/api/boards')
      .then((res) => {
        console.log(res);
        // Fix the data model for older boards
        const boards = res.data.boards;
        for (const bi in boards) {
          const b = boards[bi];
          if (!b.scaleBy) b.scaleBy = 2;
          if (!b.isPrivate) b.isPrivate = false;
          if (!b.privatePin) b.privatePin = '';
        }
        // Set the vvalues
        setBoardList({ boards: boards });
      })
      .catch((error) => {
        if (!error.response.data.authentication) document.location.href = '/';
      });

    function boardsUpdate(newData: any) {
      setBoardList(newData);
    }
    // Updates through websocket
    socket.on('boards-update', boardsUpdate);
    return () => {
      socket.off('boards-update', boardsUpdate);
    };
  }, []);

  // Element to set the focus to when loading the page
  const initialRef = React.useRef<HTMLInputElement>(null);

  // Search beahavior
  const handleSearch = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const term = event.currentTarget.value;
    // save the search term, list will be filtered with it
    setSearchTerm(term);
  };

  // When the page opens, select the text for quick search
  useEffect(() => {
    initialRef.current?.select();
  }, [initialRef.current]);


  return (
    <VStack>
      {/* Search box */}
      <InputGroup width={"50%"}>
        <InputLeftElement pointerEvents='none' children={<FaSearch color='gray.900' />} />
        <Input ref={initialRef} placeholder="Board or owner name..." mb={2} focusBorderColor="gray.500" onChange={handleSearch} />
      </InputGroup >
      <Wrap align="stretch" justify="center" >
        {/* Board cards */}
        {(boardList as { boards: any[] } | undefined)?.boards
          .sort((a, b) => {
            // Sort the boards by name
            const nameA = a.name.toUpperCase();
            const nameB = b.name.toUpperCase();
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            return 0;
          })
          // filter the boards by the search term
          .filter((it) => {
            if (searchTerm) {
              // using board name or owner name
              if (it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                it.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
              ) return it;
            } else return it;
            return null;
          })
          .map(({ id, name, width, height, scaleBy, isPrivate, privatePin, ownerName, ownerId, createTime, updateTime, groups }, i) => (
            <WrapItem d="flex" alignItems="stretch" key={id}>
              <BoardCard
                onEdit={(idx: string, boardInfo: boardInfoProps) => {
                  if (boardInfo.name && boardInfo.height && boardInfo.width) {
                    axios.post('/api/boards/edit', { id: idx, boardInfo: boardInfo }).catch((error) => {
                      if (!error.response.data.authentication) document.location.href = '/';
                    });
                    return true;
                  }
                  return false;
                }}
                {...{
                  id,
                  name,
                  width,
                  height,
                  scaleBy,
                  ownerName,
                  ownerId,
                  isPrivate,
                  privatePin,
                  isOwner: ownerId === props.user.uid,
                  createTime: new Date(createTime),
                  updateTime: new Date(updateTime),
                  groups,
                  users: users.filter((el) => el.boardId === id),
                }}
                // Change permissions
                onClickPermissions={() =>
                  axios
                    .post(`/api/boards/${!groups.all ? 'grant' : 'revoke'}`, {
                      boardId: id,
                      group: 'all',
                    })
                    .catch((error) => {
                      if (!error.response.data.authentication) document.location.href = '/';
                    })
                }
                onDeleteBoard={async () => {
                  const success = await axios.post(`/api/boards/delete`, {
                    boardId: id,
                  });
                  let boardInfo;
                  for (let j = 0; j < boardList.boards.length; j++) {
                    if (id === boardList.boards[j].id) {
                      boardInfo = boardList.boards[j];
                    }
                  }
                  if (success) {
                    toast({
                      title: `Board ${boardInfo.name} has been succesfully deleted`,
                      status: 'success',
                      duration: 2 * 1000,
                      isClosable: true,
                    });
                  } else {
                    toast({
                      title: `Board ${boardInfo.name} could not be deleted`,
                      status: 'error',
                      duration: 2 * 1000,
                      isClosable: true,
                    });
                  }
                }}
              />
            </WrapItem>
          ))}
        {props.user.userRole === 'guest' ? null : (
          <WrapItem d="flex" alignItems="stretch">
            <InputCard
              // Create a new board
              onCreate={(boardInfo: boardInfoProps) => {
                if (boardInfo.name && boardInfo.height && boardInfo.width && boardInfo.scaleBy) {
                  axios.post('/api/boards/create', boardInfo).catch((error) => {
                    if (!error.response.data.authentication) document.location.href = '/';
                  });
                  return true;
                }
                return false;
              }}
            />
          </WrapItem>
        )}
      </Wrap>
    </VStack>
  );
}
