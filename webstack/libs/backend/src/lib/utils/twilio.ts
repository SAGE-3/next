/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PresenceSchema, TwilioConfiguration } from '@sage3/shared/types';
import { AppSchema } from '@sage3/applications/schema';
import { SAGE3Collection } from '../generics';

import { Twilio } from 'twilio/lib';
const AccessToken = Twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

/**
 * SAGE Server Twilio Helper Class
 */
export class SAGETwilio {
  private config: TwilioConfiguration;

  /**
   *
   * @param config Twilio config file
   * @param appCollection The apps collection
   * @param clearAppsInterval How often to check the apps collection for twilio apps that have expired (ms)
   * @param expiration How long can twilio apps live before they expire (ms)
   */
  constructor(
    config: TwilioConfiguration,
    appCollection: SAGE3Collection<AppSchema>,
    presCollection: SAGE3Collection<PresenceSchema>,
    clearAppsInterval: number,
    expiration: number
  ) {
    this.config = config;
    this.clearTwilioApps(appCollection, presCollection, clearAppsInterval, expiration);
  }

  /**
   * Generate a Twilio Token for the given user for the given roomId
   * @param userId The user id to generate a token for
   * @param videoRoomId The Twilio roomId the user is attempting to join
   * @returns
   */
  public generateVideoToken(userId: string, roomId: string) {
    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const token = new AccessToken(this.config.accountSid, this.config.apiKey, this.config.apiSecret, { identity: userId });

    // Grant the access token Twilio Video capabilities
    const grant = new VideoGrant({
      room: roomId,
    });

    token.addGrant(grant);

    // Serialize the token to a JWT string
    return token.toJwt();
  }

  /**
   * Clear twilio apps that have expired or the user has left the board
   */
  private clearTwilioApps(
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
