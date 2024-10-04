/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { UserSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

import { SAGEBase } from '@sage3/sagebase';

import { config } from '../../config';

class SAGE3UsersCollection extends SAGE3Collection<UserSchema> {
  constructor() {
    super('USERS', {
      name: '',
      email: '',
      userRole: 'user',
    });

    const router = sageRouter<UserSchema>(this);

    router.post('/create', async ({ body, user }, res) => {
      let doc = null;
      const id = (user as any).id;
      if (user) {
        doc = await this.add(body, id, id);
      }
      if (doc) res.status(200).send({ success: true, data: [doc] });
      else res.status(500).send({ success: false, message: 'Failed to create user.' });
    });

    router.post('/accountDeletion', async ({ body, user, authInfo }, res) => {
      console.log(authInfo);
      const userId = (user as any).id;
      if (!userId) {
        res.status(401).send({ success: false, message: 'Unauthorized' });
        return;
      }

      // Does the Body contain the id to delete?
      const userIdToDelete = body.id;
      if (!userIdToDelete) {
        res.status(400).send({ success: false, message: 'No ID provided' });
        return;
      }

      // Only admins and the user themselves can delete their account
      let isSameUser = false;
      if (userId === userIdToDelete) {
        isSameUser = true;
      }

      // Get Admins from config file
      const adminEmails = config.auth.admins || [];
      // Get the user from the database
      const userDoc = await this.get(userIdToDelete);
      // Get the user email
      const userEmail = userDoc?.data.email;

      // If no user email was found, return an error
      if (!userEmail) {
        res.status(404).send({ success: false, message: 'User is not registered and may be a guest.' });
        return;
      }

      // Check if the user is an admin
      let isAdmin = false;
      if (userEmail) {
        isAdmin = adminEmails.includes(userEmail);
      }

      // Only admins and the user themselves can delete their account
      if (!isAdmin && !isSameUser) {
        res.status(401).send({ success: false, message: 'Unauthorized' });
        return;
      }

      // This user is allowed to delete the account
      console.log(`User Deletion Request for ${userEmail}`);
      console.log(`User Deletion process started`);

      const userCollDelete = await this.delete(userIdToDelete);
      console.log(`User Collection Delete ${userCollDelete ? 'Success' : 'Failed'}`);

      // Now we need to delete all the user's data

      // Delete Authorization Information
      const authCollDelete = await SAGEBase.Auth.deleteAuthByEmail(userEmail);
      console.log(`Auth Collection Delete ${authCollDelete ? 'Success' : 'Failed'}`);
      // Delete the User's Rooms

      // Delete the User's Boards

      // Delete the User's Apps

      // Delete the User's Assets

      // Delete the User's Plugins
    });

    this.httpRouter = router;
  }

  public async removeAllTemporaryAccount() {
    // Remove all temporary accounts (Guest, Spectators)
    // userRole == 'guest' || userRole == 'spectator'
    const guests = await this.query('userRole', 'guest');
    const spectators = await this.query('userRole', 'spectator');
    const guestsIds = guests ? guests.map((guest) => guest._id) : [];
    const spectatorsIds = spectators ? spectators.map((spectator) => spectator._id) : [];
    const allIds = [...guestsIds, ...spectatorsIds];
    await this.deleteBatch(allIds);
    console.log('SBUser > All Temporary Accounts Deleted. Count:', allIds.length);
  }
}

export const UsersCollection = new SAGE3UsersCollection();
