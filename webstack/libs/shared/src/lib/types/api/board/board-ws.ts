/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { BoardSchema } from "../../schemas"
import { APIWSEvent, APIWSRequest, APIWSResponse } from "../type"

export type CreateRequest = APIWSRequest & {
  type: 'post'
  route: '/api/board/create',
  body: {
    name: BoardSchema['name'],
    description: BoardSchema['description'],
    roomId: BoardSchema['roomId']
  }
}

export type CreateResponse = APIWSResponse & {
  type: 'post',
  route: '/api/board/create',
  body: {
    success: boolean,
    board: BoardSchema | undefined
  }
}

export type ReadRequest = APIWSRequest & {
  type: 'get',
  route: '/api/board/read',
  body: {
    id: BoardSchema['id']
  }
}

export type ReadResponse = APIWSResponse & {
  type: 'get',
  route: '/api/board/read',
  body: {
    success: boolean,
    board: BoardSchema | undefined
  }
}

export type ReadAllRequest = APIWSRequest & {
  type: 'get',
  route: '/api/board/read/all',
  body: {
  }
}

export type ReadAllResponse = APIWSResponse & {
  type: 'get',
  route: '/api/board/read/all',
  body: {
    success: boolean,
    boards: BoardSchema[] | undefined
  }
}

export type ReadByRoomIdRequest = APIWSRequest & {
  type: 'get',
  route: '/api/board/read/roomid',
  body: {
    roomId: BoardSchema['roomId']
  }
}

export type ReadByRoomIdResponse = APIWSResponse & {
  type: 'get',
  route: '/api/board/read/roomid',
  body: {
    success: boolean,
    boards: BoardSchema[] | undefined
  }
}


export type DeleteRequest = APIWSRequest & {
  type: 'del',
  route: '/api/board/delete',
  body: {
    id: BoardSchema['id']
  }
}

export type DeleteResponse = APIWSResponse & {
  type: 'del',
  route: '/api/board/delete',
  body: {
    success: boolean,
  }
}

export type BoardSub = APIWSRequest & {
  type: 'sub',
  route: '/api/board/subscribe',
  body: {
    id: BoardSchema['id']
  }
}

export type AllBoardsSub = APIWSRequest & {
  type: 'sub',
  route: '/api/board/subscribe/all',
  body: {
  }
}

export type ByRoomIdSub = APIWSRequest & {
  type: 'sub',
  route: '/api/board/subscribe/roomid',
  body: {
    roomId: BoardSchema['roomId']
  }
}

export type Unsub = APIWSRequest & {
  type: 'unsub'
  route: '/api/board/unsubscribe',
  body: {
    subId: string;
  }
}

export type BoardEvent = APIWSEvent<BoardSchema> & {
}

export type Message =
  CreateRequest |
  CreateResponse |
  ReadRequest |
  ReadResponse |
  ReadAllRequest |
  ReadAllResponse |
  ReadByRoomIdRequest |
  ReadByRoomIdResponse |
  DeleteRequest |
  DeleteResponse |
  BoardSub |
  AllBoardsSub |
  ByRoomIdSub |
  Unsub |
  BoardEvent;
