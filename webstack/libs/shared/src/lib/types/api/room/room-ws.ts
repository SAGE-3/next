/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RoomSchema } from "../../schemas"
import { APIWSEvent, APIWSRequest, APIWSResponse } from "../type"

export type CreateRequest = APIWSRequest & {
  type: 'post'
  route: '/api/room/create',
  body: {
    name: RoomSchema['name'],
    description: RoomSchema['description'],
  }
}

export type CreateResponse = APIWSResponse & {
  type: 'post',
  route: '/api/room/create',
  body: {
    success: boolean,
    room: RoomSchema | undefined
  }
}

export type ReadRequest = APIWSRequest & {
  type: 'get',
  route: '/api/room/read',
  body: {
    id: RoomSchema['id']
  }
}

export type ReadResponse = APIWSResponse & {
  type: 'get',
  route: '/api/room/read',
  body: {
    success: boolean,
    room: RoomSchema | undefined
  }
}

export type ReadAllRequest = APIWSRequest & {
  type: 'get',
  route: '/api/room/read/all',
  body: {
  }
}

export type ReadAllResponse = APIWSResponse & {
  type: 'get',
  route: '/api/room/read/all',
  body: {
    success: boolean,
    rooms: RoomSchema[] | undefined
  }
}

export type DeleteRequest = APIWSRequest & {
  type: 'del',
  route: '/api/room/delete',
  body: {
    id: RoomSchema['id']
  }
}

export type DeleteResponse = APIWSResponse & {
  type: 'del',
  route: '/api/room/delete',
  body: {
    success: boolean,
  }
}

export type RoomSub = APIWSRequest & {
  type: 'sub',
  route: '/api/room/subscribe',
  body: {
    id: RoomSchema['id']
  }
}

export type AllRoomsSub = APIWSRequest & {
  type: 'sub',
  route: '/api/room/subscribe/all',
  body: {
  }
}

export type Unsub = APIWSRequest & {
  type: 'unsub'
  route: '/api/room/unsubscribe',
  body: {
    subId: string;
  }
}

export type RoomEvent = APIWSEvent<RoomSchema> & {
}

export type Message =
  CreateRequest |
  CreateResponse |
  ReadRequest |
  ReadResponse |
  ReadAllRequest |
  ReadAllResponse |
  DeleteRequest |
  DeleteResponse |
  RoomSub |
  AllRoomsSub |
  Unsub |
  RoomEvent;