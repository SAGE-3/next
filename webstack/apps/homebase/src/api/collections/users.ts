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
import { RoomDeleteInfo, RoomsCollection } from './rooms';
import { BoardDeleteInfo, BoardsCollection } from './boards';
import { AppsCollection } from './apps';
import { AssetsCollection } from './assets';
import { PluginsCollection } from './plugins';

type UserStats = {
  userId: string;
  numRooms: number;
  numBoards: number;
  numApps: number;
  numAssets: number;
  numPlugins: number;
};

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

    // This route will statistical information about the user

    router.post('/userStats', async ({ body }, res) => {
      const userId = body.userId;
      if (!userId) {
        res.status(400).send({ success: false, message: 'No userId provided' });
        return;
      }

      const rooms = await RoomsCollection.query('ownerId', userId);
      const numRooms = rooms ? rooms.length : 0;
      const boards = await BoardsCollection.query('ownerId', userId);
      const numBoards = boards ? boards.length : 0;
      const apps = await AppsCollection.query('_createdBy', userId);
      const numApps = apps ? apps.length : 0;
      const assets = await AssetsCollection.query('owner', userId);
      const numAssets = assets ? assets.length : 0;
      const plugins = await PluginsCollection.query('ownerId', userId);
      const numPlugins = plugins ? plugins.length : 0;

      const userStats: UserStats = {
        userId,
        numRooms,
        numBoards,
        numApps,
        numAssets,
        numPlugins,
      };

      res.status(200).send({ success: true, data: { userStats } });
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

      this.userDeleteLog('User Deletion Request Started', userEmail);

      const userCollDelete = await this.delete(userIdToDelete);
      const userCollectionRemoval = userCollDelete ? true : false;
      this.userDeleteLog(`User Collection Delete ${userCollectionRemoval ? 'Success' : 'Failed'}`, userEmail);

      const authCollDelete = await SAGEBase.Auth.deleteAuthByEmail(userEmail);
      const authCollectionRemoval = authCollDelete ? true : false;
      this.userDeleteLog(`Auth Collection Delete ${authCollectionRemoval ? 'Success' : 'Failed'}`, userEmail);

      // Delete the User's Rooms
      const roomsDeleteInfo = await RoomsCollection.deleteUsersRooms(userIdToDelete);

      // Delete the User's Boards
      const boardsDeleteInfo = await BoardsCollection.deleteUsersBoards(userIdToDelete);

      // Delete the User's Apps
      const appsDeleted = await AppsCollection.deleteUsersApps(userIdToDelete);

      // Delete the User's Assets
      const assetsDelete = await AssetsCollection.deleteUsersAssets(userIdToDelete);

      // Delete the User's Plugins
      const pluginsDeleted = await PluginsCollection.deletePluginsByUser(userIdToDelete);

      // Total Rooms Deleted
      const totalRoomsDeleted = roomsDeleteInfo.length;

      // Total Boards Deleted
      const boards = [];
      roomsDeleteInfo.forEach((room) => {
        boards.push(...room.boardsDeleteInfo);
      });
      boards.push(...boardsDeleteInfo);
      const totalBoardsDeleted = boards.length;

      // Total Apps Deleted
      let boardApps = 0;
      boards.forEach((board) => {
        boardApps += board.appsDeleted;
      });
      const totalAppsDeleted = appsDeleted + boardApps;

      // Total Assets Deleted
      let roomAssets = 0;
      roomsDeleteInfo.forEach((room) => {
        roomAssets += room.assetsDeleted;
      });
      const totalAssetsDeleted = roomAssets + assetsDelete;

      // Total Plugins Deleted
      let roomPlugins = 0;
      roomsDeleteInfo.forEach((room) => {
        roomPlugins += room.pluginsDeleted;
      });
      const totalPluginsDeleted = roomPlugins + pluginsDeleted;

      this.userDeleteLog(`Rooms Deleted: ${totalRoomsDeleted}`, userEmail);
      this.userDeleteLog(`Boards Deleted: ${totalBoardsDeleted}`, userEmail);
      this.userDeleteLog(`Apps Deleted: ${totalAppsDeleted}`, userEmail);
      this.userDeleteLog(`Assets Deleted: ${totalAssetsDeleted}`, userEmail);
      this.userDeleteLog(`Plugins Deleted: ${totalPluginsDeleted}`, userEmail);

      this.userDeleteLog('User Deletion Request Finished', userEmail);
      res.status(200).send({ success: true });
    });

    this.httpRouter = router;
  }

  private userDeleteLog(message: string, email: string) {
    console.log(`USER DELETION (${email}) >> ${message}`);
  }

  // Remove all temporary user accounts at server startup
  public async removeAllTemporaryAccount() {
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
