/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppSchema } from '@sage3/applications/schema';
import { APIWSEvent, APIWSRequest, APIWSResponse } from "../type"

export type CreateRequest = APIWSRequest & {
  type: 'post'
  route: '/api/app/create',
  body: {
    name: AppSchema['name'],
    description: AppSchema['description'],
    roomId: AppSchema['roomId']
    boardId: AppSchema['boardId'],
    type: AppSchema['type'],
    state: AppSchema['state'],
  }
}

export type CreateResponse = APIWSResponse & {
  type: 'post',
  route: '/api/app/create',
  body: {
    success: boolean,
    app: AppSchema | undefined
  }
}

export type ReadRequest = APIWSRequest & {
  type: 'get',
  route: '/api/app/read',
  body: {
    id: AppSchema['id']
  }
}

export type ReadResponse = APIWSResponse & {
  type: 'get',
  route: '/api/app/read',
  body: {
    success: boolean,
    app: AppSchema | undefined
  }
}

export type ReadAllRequest = APIWSRequest & {
  type: 'get',
  route: '/api/app/read/all',
  body: {
  }
}

export type ReadAllResponse = APIWSResponse & {
  type: 'get',
  route: '/api/app/read/all',
  body: {
    success: boolean,
    apps: AppSchema[] | undefined
  }
}

export type ReadByRoomIdRequest = APIWSRequest & {
  type: 'get',
  route: '/api/app/read/roomid',
  body: {
    roomId: AppSchema['roomId']
  }
}


export type ReadByRoomIdResponse = APIWSResponse & {
  type: 'get',
  route: '/api/app/read/roomid',
  body: {
    success: boolean,
    apps: AppSchema[] | undefined
  }
}

export type ReadByBoardIdRequest = APIWSRequest & {
  type: 'get',
  route: '/api/app/read/boardid',
  body: {
    boardId: AppSchema['boardId']
  }
}


export type ReadByBoardIdResponse = APIWSResponse & {
  type: 'get',
  route: '/api/app/read/boardid',
  body: {
    success: boolean,
    apps: AppSchema[] | undefined
  }
}


export type DeleteRequest = APIWSRequest & {
  type: 'del',
  route: '/api/app/delete',
  body: {
    id: AppSchema['id']
  }
}

export type DeleteResponse = APIWSResponse & {
  type: 'del',
  route: '/api/app/delete',
  body: {
    success: boolean,
  }
}

export type AppSub = APIWSRequest & {
  type: 'sub',
  route: '/api/app/subscribe',
  body: {
    id: AppSchema['id']
  }
}

export type AllAppsSub = APIWSRequest & {
  type: 'sub',
  route: '/api/app/subscribe/all',
  body: {
  }
}

export type ByRoomIdSub = APIWSRequest & {
  type: 'sub',
  route: '/api/app/subscribe/roomid',
  body: {
    roomId: AppSchema['roomId']
  }
}

export type ByBoardIdSub = APIWSRequest & {
  type: 'sub',
  route: '/api/app/subscribe/boardid',
  body: {
    boardId: AppSchema['boardId']
  }
}

export type Unsub = APIWSRequest & {
  type: 'unsub'
  route: '/api/app/unsubscribe',
  body: {
    subId: string;
  }
}

export type BoardEvent = APIWSEvent<AppSchema> & {
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
  ReadByBoardIdRequest |
  ReadByBoardIdResponse |
  DeleteRequest |
  DeleteResponse |
  AppSub |
  AllAppsSub |
  ByRoomIdSub |
  ByBoardIdSub |
  Unsub |
  BoardEvent;
