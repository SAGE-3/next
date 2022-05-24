/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UserSchema } from "../../schemas"
import { APIWSEvent, APIWSRequest, APIWSResponse } from "../type"

export type CreateRequest = APIWSRequest & {
  type: 'post'
  route: '/api/user/create',
  body: {
    name: UserSchema['name'],
    email: UserSchema['email'],
  }
}

export type CreateResponse = APIWSResponse & {
  type: 'post',
  route: '/api/user/create',
  body: {
    success: boolean,
    user: UserSchema | undefined
  }
}

export type ReadRequest = APIWSRequest & {
  type: 'get',
  route: '/api/user/read',
  body: {
    id: UserSchema['id']
  }
}

export type ReadResponse = APIWSResponse & {
  type: 'get',
  route: '/api/user/read',
  body: {
    success: boolean,
    user: UserSchema | undefined
  }
}

export type ReadAllRequest = APIWSRequest & {
  type: 'get',
  route: '/api/user/read/all',
  body: {
  }
}

export type ReadAllResponse = APIWSResponse & {
  type: 'get',
  route: '/api/user/read/all',
  body: {
    success: boolean,
    users: UserSchema[] | undefined
  }
}

export type ReadCurrentRequest = APIWSRequest & {
  type: 'get',
  route: '/api/user/read/current',
  body: {
  }
}

export type ReadCurrentResponse = APIWSResponse & {
  type: 'get',
  route: '/api/user/read/current',
  body: {
    success: boolean,
    user: UserSchema | undefined
  }
}


export type DeleteRequest = APIWSRequest & {
  type: 'del',
  route: '/api/user/delete',
  body: {
    id: UserSchema['id']
  }
}

export type DeleteResponse = APIWSResponse & {
  type: 'del',
  route: '/api/user/delete',
  body: {
    success: boolean,
  }
}

export type UserSub = APIWSRequest & {
  type: 'sub',
  route: '/api/user/subscribe',
  body: {
    id: UserSchema['id']
  }
}

export type AllUsersSub = APIWSRequest & {
  type: 'sub',
  route: '/api/user/subscribe/all',
  body: {
  }
}

export type UserCurrentSub = APIWSRequest & {
  type: 'sub',
  route: '/api/user/subscribe/current',
  body: {
  }
}

export type Unsub = APIWSRequest & {
  type: 'unsub'
  route: '/api/user/unsubscribe',
  body: {
    subId: string;
  }
}

export type UserEvent = APIWSEvent<UserSchema> & {
}

export type Message =
  CreateRequest |
  CreateResponse |
  ReadRequest |
  ReadResponse |
  ReadAllRequest |
  ReadAllResponse |
  ReadCurrentRequest |
  ReadCurrentResponse |
  DeleteRequest |
  DeleteResponse |
  UserSub |
  AllUsersSub |
  UserCurrentSub |
  Unsub |
  UserEvent;
