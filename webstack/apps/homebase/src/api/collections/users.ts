/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Router } from 'express';
import { WebSocket } from 'ws';

import { APIClientWSMessage, UserSchema } from '@sage3/shared/types';
import { SAGE3Collection, SubscriptionCache, sageRouter } from '@sage3/backend';

import { SAGEBase, SBAuthSchema, createRateLimiter } from '@sage3/sagebase';

import { isAdmin, firstAdminId } from '../admins';
import { RoomsCollection } from './rooms';
import { BoardsCollection } from './boards';
import { AppsCollection } from './apps';
import { AssetsCollection } from './assets';
import { PluginsCollection } from './plugins';
import { RoomMembersCollection } from './roommembers';

// The only POST routes on users: the generic POST would add documents with any id and email
const USER_POST_ROUTES = ['/create', '/userStats', '/accountDeletion'];
// Profile fields set by the server from the login, never by an update
const PROTECTED_FIELDS = ['email', 'userRole'];

/**
 * Check a write to the users collection, for the REST and the WebSocket routes.
 * A user can update only their own document, and not its protected fields (removed from the body).
 * Documents are created with /create and deleted with /accountDeletion only.
 * @returns an error message, or undefined when the write is allowed
 */
function userWriteError(method: string, path: string, body: unknown, auth: SBAuthSchema): string | undefined {
  if (['GET', 'HEAD', 'OPTIONS', 'SUB', 'UNSUB'].includes(method)) return undefined;
  if (method === 'POST') return USER_POST_ROUTES.includes(path) ? undefined : 'Use /api/users/create';
  if (method === 'PUT') {
    const id = path.split('/').filter(Boolean)[0];
    if (!id || id !== auth.id) return 'You can only update your own user document';
    if (body && typeof body === 'object') {
      for (const field of PROTECTED_FIELDS) delete (body as Record<string, unknown>)[field];
    }
    return undefined;
  }
  return 'Use /api/users/accountDeletion';
}

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

    // The user's own document, with the id of their login.
    // The email and role come from the login, not from the request.
    router.post('/create', async ({ body, user }, res) => {
      let doc = null;
      const auth = user as SBAuthSchema;
      if (auth?.id) {
        const guestLike = auth.provider === 'guest' || auth.provider === 'spectator';
        const email = guestLike ? auth.email || auth.displayName || '' : auth.email || '';
        const userRole = guestLike ? (auth.provider as UserSchema['userRole']) : 'user';
        doc = await this.add({ ...body, email, userRole }, auth.id, auth.id);
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

    router.post('/accountDeletion', createRateLimiter(1), async ({ body, user }, res) => {
      const userRequestingDeletion = user as SBAuthSchema;

      // Is the user logged in?
      if (!userRequestingDeletion.id) {
        res.status(401).send({ success: false, message: 'Unauthorized' });
        return;
      }

      // Does the Body contain the id to delete?
      const userIdToDelete = body.id;
      if (!userIdToDelete) {
        res.status(400).send({ success: false, message: 'No User ID provided' });
        return;
      }

      // Is the user making the request the same as the user to delete?
      const isSameUser = userRequestingDeletion.id === userIdToDelete;

      // Get the user from the database
      const userToDelete = await this.get(userIdToDelete);

      // Does the user exist?
      if (!userToDelete) {
        res.status(404).send({ success: false, message: 'User not found' });
        return;
      }

      // The login record of the user to delete (same id as the user document).
      // Its email comes from the identity provider; the profile email can be edited by the user.
      const authToDelete = await SAGEBase.Auth.findAuthById(userIdToDelete);
      const userEmail = authToDelete?.email;
      if (!authToDelete || !userEmail || authToDelete.provider === 'guest' || authToDelete.provider === 'spectator') {
        res.status(404).send({ success: false, message: 'User is not registered and may be a guest.' });
        return;
      }

      // Admins can not be deleted
      if (isAdmin(authToDelete)) {
        res.status(401).send({ success: false, message: 'Unauthorized. Admins can not be deleted.' });
        return;
      }

      // Only admins or the user themselves can delete their account
      if (!isSameUser && !isAdmin(userRequestingDeletion)) {
        res.status(401).send({ success: false, message: 'Unauthorized' });
        return;
      }

      // Check if the user wants to delete all data
      const deleteAllData = body.deleteAllData ? body.deleteAllData : false;
      // If the user doesnt want to delete their data, ensure there is an admin account to transfer the data to
      const transferId = deleteAllData ? undefined : await firstAdminId();
      const adminAccount = transferId ? await this.get(transferId) : undefined;
      if (!deleteAllData && !adminAccount) {
        res
          .status(400)
          .send({ success: false, message: 'Admin account not found to transfer data to. Please contact the server administrator.' });
        return;
      }

      // All checks passed. Start the deletion process.
      this.userDeleteLog('User Deletion Request Started', userEmail);
      this.userDeleteLog(`Delete All Data: ${deleteAllData}`, userEmail);

      const userCollDelete = await this.delete(userIdToDelete);
      const userCollectionRemoval = userCollDelete ? true : false;
      this.userDeleteLog(`User Collection Delete ${userCollectionRemoval ? 'Success' : 'Failed'}`, userEmail);

      const authCollectionRemoval = await SAGEBase.Auth.deleteAuth(authToDelete);
      this.userDeleteLog(`Auth Collection Delete ${authCollectionRemoval ? 'Success' : 'Failed'}`, userEmail);

      // If the data is not to be deleted, transfer ownership of rooms, boards, apps, assets, and plugins to the server admins
      if (!deleteAllData && adminAccount) {
        const adminId = adminAccount._id;
        this.userDeleteLog(`User data will be transferred to admin account with email: ${adminAccount.data.email}`, userEmail);

        // Transfer Rooms
        const roomsTransfer = await RoomsCollection.transferUsersRooms(userIdToDelete, adminId);
        // For each room, join the room as a member
        roomsTransfer.forEach((roomId) => {
          RoomMembersCollection.addMember(roomId, adminId);
        });

        // Transfer Boards
        const boardsTransfer = await BoardsCollection.transferUsersBoards(userIdToDelete, adminId);

        // Transfer Apps
        const appsTransfer = await AppsCollection.transferUsersApps(userIdToDelete, adminId);

        // Transfer Assets
        const assetsTransfer = await AssetsCollection.transferUsersAssets(userIdToDelete, adminId);

        // Transfer Plugins
        const pluginsTransfer = await PluginsCollection.transferUsersPlugins(userIdToDelete, adminId);

        // Log the transfer information
        this.userDeleteLog(`Rooms Transfer: ${roomsTransfer ? 'Success' : 'Failed'}`, userEmail);
        this.userDeleteLog(`Boards Transfer: ${boardsTransfer ? 'Success' : 'Failed'}`, userEmail);
        this.userDeleteLog(`Apps Transfer: ${appsTransfer ? 'Success' : 'Failed'}`, userEmail);
        this.userDeleteLog(`Assets Transfer: ${assetsTransfer ? 'Success' : 'Failed'}`, userEmail);
        this.userDeleteLog(`Plugins Transfer: ${pluginsTransfer ? 'Success' : 'Failed'}`, userEmail);

        this.userDeleteLog('User Deletion Request Finished', userEmail);
        res.status(200).send({ success: true });
      } else {
        this.userDeleteLog('User data will be permentately deleted', userEmail);

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
      }
    });

    // Check every write before the generic and custom routes
    const guarded = Router();
    guarded.use((req, res, next) => {
      const error = userWriteError(req.method, req.path, req.body, req.user as SBAuthSchema);
      if (error) res.status(403).send({ success: false, message: error });
      else next();
    });
    guarded.use(router);
    this.httpRouter = guarded;
  }

  // Same check for the WebSocket routes ('/api/users/<id>')
  public override wsRouter(socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache): Promise<void> {
    const route = message.route.split('?')[0];
    const path = message.body?.batch ? '/' : route.replace(/^\/api\/users/, '') || '/';
    const error = userWriteError(message.method, path, message.body, user);
    if (error) {
      socket.send(JSON.stringify({ id: message.id, success: false, message: error }));
      return Promise.resolve();
    }
    return super.wsRouter(socket, message, user, cache);
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
    console.log('SBUser> All Temporary Accounts Deleted. Count:', allIds.length);
  }
}

export const UsersCollection = new SAGE3UsersCollection();
