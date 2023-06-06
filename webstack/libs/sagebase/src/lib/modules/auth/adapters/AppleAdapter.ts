/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';
import * as AppleStrategy from 'passport-apple';

import { SBAuthDB } from '../SBAuthDatabase';

export type SBAuthAppleConfig = {
  clientID: string;
  teamID: string;
  keyID: string;
  callbackURL: string;
  routeEndpoint: string;
  privateKeyLocation: string;
};

/*
   client_id: string;
    team_id: string;
    redirect_uri: string;
    key_id: string;
    scope: string;
*/

/**
 * Setup function of the Google Passport Strategy.
 * @param router The express router
 */
export function passportAppleSetup(config: SBAuthAppleConfig): boolean {
  try {
    passport.use(
      'apple',
      // @ts-ignore
      new AppleStrategy(
        {
          authorizationURL: config.routeEndpoint,
          clientID: config.clientID,
          teamID: config.teamID,
          keyID: config.keyID,
          privateKeyLocation: config.privateKeyLocation,
          scope: 'email name',
          passReqToCallback: true,
        },
        async (
          req: any,
          accessToken: string,
          refreshToken: string,
          decodedIdToken: AppleStrategy.DecodedIdToken,
          profile: AppleStrategy.Profile,
          verified: AppleStrategy.VerifyCallback
        ) => {
          console.log('Apple Login> profile', profile);
          const displayName = profile.displayName;
          const email = profile.emails ? profile.emails[0].value : '';
          const picture = profile.photos ? profile.photos[0].value : '';
          const extras = {
            displayName: displayName ?? '',
            email: email ?? '',
            picture: picture ?? '',
          };
          const authRecord = await SBAuthDB.findOrAddAuth('apple', profile.id, extras);
          if (authRecord != undefined) {
            verified(null, authRecord);
          } else {
            verified(null, undefined);
          }
        }
      )
    );
    console.log('Apple Login> Setup done');
    return true;
  } catch (error) {
    console.log('Apple Login> Failed setup', error);
    return false;
  }
}
