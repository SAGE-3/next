/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// CASL
import { BoardSchema, UserSchema } from '@sage3/shared/types';
import { BoardsCollection, RoomsCollection, UsersCollection } from '../collections';

import * as express from 'express';

// Type of Boad Actions
type BoardActions = 'create' | 'read' | 'update' | 'delete';
// Type of HTTP Methods
type HTTPMethods = 'get' | 'post' | 'put' | 'delete';

// Map the HTTP methods to the actions
const methodTable: { [method in HTTPMethods]: BoardActions } = {
  get: 'read',
  post: 'create',
  put: 'update',
  delete: 'delete',
};

type BoardPermissionType = {
  [role in UserSchema['userRole']]: {
    create: (userId: string, roomId: string) => Promise<boolean>;
    read: (userId: string, boardId: string) => Promise<boolean>;
    update: (userId: string, boardId: string) => Promise<boolean>;
    delete: (userId: string, boardId: string) => Promise<boolean>;
  };
};

// The actual permissions
const permissions: BoardPermissionType = {
  admin: {
    create: () => Promise.resolve(true),
    read: () => Promise.resolve(true),
    update: () => Promise.resolve(true),
    delete: () => Promise.resolve(true),
  },
  user: {
    // Users can create boards only if they are a member of the room
    create: async (userId: string, roomId: string) => {
      const room = await RoomsCollection.get(roomId);
      if (!room) return Promise.resolve(false);
      return Promise.resolve(room.data.members.includes(userId));
    },
    // Users can read boards only if they are a member of the room
    read: async (userId: string, boardId: string) => {
      const board = await BoardsCollection.get(boardId);
      if (!board) return false;
      const room = await RoomsCollection.get(board.data.roomId);
      if (!room) return false;
      if (room.data.members) {
        return room.data.members.includes(userId);
      } else {
        return false;
      }
    },
    // Users can update boards they created
    // Or if they created the room
    update: async (userId: string, boardId: string) => {
      const board = await BoardsCollection.get(boardId);
      if (!board) return false;
      if (board.data.ownerId === userId) return true;
      const room = await RoomsCollection.get(board.data.roomId);
      if (!room) return false;
      return room.data.ownerId === userId;
    },
    // Users can delete boards they created
    // Or if they created the room
    delete: async (userId: string, boardId: string) => {
      const board = await BoardsCollection.get(boardId);
      if (!board) return false;
      if (board.data.ownerId === userId) return true;
      const room = await RoomsCollection.get(board.data.roomId);
      if (!room) return false;
      return room.data.ownerId === userId;
    },
  },
  guest: {
    create: () => Promise.resolve(false),
    read: async (userId: string, boardId: string) => {
      const board = await BoardsCollection.get(boardId);
      if (!board) return false;
      const room = await RoomsCollection.get(board.data.roomId);
      if (!room) return false;
      return room.data.members.includes(userId);
    },
    update: () => Promise.resolve(false),
    delete: () => Promise.resolve(false),
  },
  spectator: {
    create: () => Promise.resolve(false),
    read: async (userId: string, boardId: string) => {
      const board = await BoardsCollection.get(boardId);
      if (!board) return false;
      const room = await RoomsCollection.get(board.data.roomId);
      if (!room) return false;
      return room.data.members.includes(userId);
    },
    update: () => Promise.resolve(false),
    delete: () => Promise.resolve(false),
  },
};

export async function boardPermission(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Check for AUTH
  const auth = req.user;
  if (!auth) {
    res.status(401).send('Unauthorized');
    return;
  }
  // Check for Method
  const method = req.method.toLowerCase() as HTTPMethods;
  if (!method) {
    res.status(400).send('Bad request');
    return;
  }
  // Check for Action
  const action = methodTable[method];
  if (!action) {
    res.status(400).send('Bad request');
    return;
  }
  // Check user exists
  const user = await UsersCollection.get(auth.id);
  if (!user) {
    res.status(401).send('Unauthorized');
    return;
  }
  // Get user info
  const role = user.data.userRole;
  const userId = user._id;

  // Allowed boolean for the action
  let allowed = false;

  // Permission by role
  const permission = permissions[role];

  console.log(role, action);
  // Check if the user is allowed to perform the action
  if (action === 'create') {
    if (req.body && req.body.batch) {
      // Check if the user is allowed to create all the boards in the batch
      // If not reject them all
      allowed = await Promise.all(req.body.batch.map((board: any) => permission.create(userId, board.roomId))).then((results) =>
        results.every((result) => result)
      );
    } else {
      allowed = await permission.create(userId, req.body.roomId);
    }
  } else if (action === 'read') {
    // Single read
    if (req.params.id) {
      allowed = await permission.read(userId, req.params.id);
    } else {
      // Query
      const query = req.query;
      // Check if this is a query
      if (Object.keys(query).length === 0) {
        // Check if the user is allowed to read all the boards
        // If not reject them all
        const boards = await BoardsCollection.getAll();
        if (boards) {
          const results = await Promise.all(boards.map((board) => permission.read(userId, board._id)));
          allowed = results.every((result) => result);
        } else {
          allowed = false;
        }
      } else {
        // Check if the user is allowed to read all the boards in the query
        // If not reject them all
        const field = Object.keys(query)[0] as keyof BoardSchema;
        const q = query[field] as string | number;
        const boards = await BoardsCollection.query(field, q);
        if (boards) {
          const results = await Promise.all(boards.map((board) => permission.read(userId, board._id)));
          allowed = results.every((result) => result);
        } else {
          allowed = false;
        }
      }
      // Batch read
      if (req.body && req.body.batch) {
        // Check if the user is allowed to read all the boards in the batch
        // If not reject them all
        allowed = await Promise.all(req.body.batch.map((board: any) => permission.read(userId, board._id))).then((results) =>
          results.every((result) => result)
        );
      }
    }
  } else if (action === 'update') {
    if (req.body && req.body.batch) {
      // Check if the user is allowed to read all the boards in the batch
      // If not reject them all
      allowed = await Promise.all(req.body.batch.map((board: any) => permission.update(userId, board._id))).then((results) =>
        results.every((result) => result)
      );
    } else {
      allowed = await permission.update(userId, req.params.id);
    }
  } else if (action === 'delete') {
    if (req.body && req.body.batch) {
      // Check if the user is allowed to delete all the boards in the batch
      // If not reject them all
      allowed = await Promise.all(req.body.batch.map((board: any) => permission.delete(userId, board._id))).then((results) =>
        results.every((result) => result)
      );
    } else {
      allowed = await permission.delete(userId, req.params.id);
    }
  }
  console.log(allowed);
  // Is the user allowed to perform the action?
  if (allowed) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}
