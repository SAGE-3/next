/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PresenceSchema, ZoomSDKConfiguration } from '@sage3/shared/types';
import { AppSchema } from '@sage3/applications/schema';
import { SAGE3Collection } from '../generics';

import { KJUR } from 'jsrsasign';

/**
 * SAGE Server Twilio Helper Class
 */
export class SAGEZoomJWTHelper {
  private config: ZoomSDKConfiguration;

  /**
   *
   * @param config Twilio config file
   * @param appCollection The apps collection
   * @param clearAppsInterval How often to check the apps collection for Zoom apps that have expired (ms)
   * @param expiration How long can Zoom apps live before they expire (ms)
   */
  constructor(
    config: ZoomSDKConfiguration,
    appCollection: SAGE3Collection<AppSchema>,
    presCollection: SAGE3Collection<PresenceSchema>,
    clearAppsInterval: number,
    expiration: number
  ) {
    this.config = config;
    this.clearScreenshareApps(appCollection, presCollection, clearAppsInterval, expiration);
  }

  /**
   * Generate a Twilio Token for the given user for the given roomId
   * @param userId The user id to generate a token for
   * @param videoRoomId The Twilio roomId the user is attempting to join
   * @returns
   */
  public generateVideoToken(userId: string, roomId: string) {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
      app_key: this.config.sdkKey,
      tpc: roomId,
      role_type: 0,
      version: 1,
      iat: iat,
      exp: exp,
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, this.config.sdkSecret);
    return sdkJWT;
  }

  /**
   * Clear Zoom apps that have expired or the user has left the board
   */
  private clearScreenshareApps(
    appCollection: SAGE3Collection<AppSchema>,
    presCollection: SAGE3Collection<PresenceSchema>,
    interval: number,
    expiration: number
  ) {
    setInterval(async () => {
      const apps = await appCollection.getAll(); // NOT IDEAL
      const pres = await presCollection.getAll();
      if (apps && pres) {
        const screenshareApps = apps.filter((app) => app.data.type === 'Screenshare');
        const now = Date.now();
        screenshareApps.forEach((screenshare) => {
          // If it has expired, deleted it.
          if (now - screenshare._createdAt > expiration) {
            appCollection.delete(screenshare._id);
            return;
          }
          // If the user is no longer on this board or connected to server. Delete it.
          // Is user still connected to sage 3
          const user = pres.find((p) => p._id === screenshare._createdBy);
          if (!user) {
            appCollection.delete(screenshare._id);
            return;
          }
          // User still on the board?
          // if (user.data.boardId !== screenshare.data.boardId) {
          //   appCollection.delete(screenshare._id);
          //   return;
          // }
        });
      }
    }, interval);
  }
}
