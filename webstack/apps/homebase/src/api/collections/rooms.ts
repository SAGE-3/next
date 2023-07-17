/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RoomMember, RoomSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';
import * as express from 'express';

class SAGE3RoomsCollection extends SAGE3Collection<RoomSchema> {
  constructor() {
    super('ROOMS', {
      name: '',
      ownerId: '',
    });

    const router = sageRouter<RoomSchema>(this);
    this.httpRouter = router;
  }
}

export const RoomsCollection = new SAGE3RoomsCollection();

/**
 * Route for clients to get the SERVER time
 * @returns
 */
export function RoomMembersRoute(): express.Router {
  const router = express.Router();

  // Invite a user to be a member of a room
  router.post('/add', async ({ body, user }, res) => {
    // Get the room id and userId from the body
    const { roomId, userId } = body;
    // Get the UserID
    const req_userId = user.id;

    // Get the room
    const roomRef = RoomsCollection.getRef(roomId);
    if (!roomRef) res.status(500).send({ success: false, message: 'Failed to process the invite request.' });
    const room = await roomRef?.read();

    // Check if user is a owner or moderator
    const members = room?.data.members;
    const role = members?.find((m) => m.userId === req_userId)?.role;
    if (role !== 'owner' && role !== 'moderator')
      res.status(500).send({ success: false, message: 'Failed to process the invite request. Insufficent permission.' });

    // Check if user is already a member
    const member = members?.find((m) => m.userId === userId);
    if (member) res.status(500).send({ success: false, message: 'Failed to process the invite request. User is already a member.' });

    // Add the user to the room
    const newMember = {
      userId,
      role: 'collaborator',
    } as RoomMember;
    members?.push(newMember);
    const response = await roomRef?.update({ members }, req_userId);

    if (response) res.status(200).send({ success: true, message: 'Successfully added user to room.' });
    else res.status(500).send({ success: false, message: 'Failed to process the invite request.' });
  });

  // // Accept an invitation to be a member of a room
  // router.post('/accept', async ({ body, user }, res) => {
  //   // TODO
  // });

  // // Reject an invitation to be a member of a room
  // router.post('/reject', async ({ body, user }, res) => {
  //   // TODO
  // });

  return router;
}
