/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

import { SBAuthDB } from '../SBAuthDatabase';

export type SBAuthGoogleConfig = {
  clientID: string;
  clientSecret: string;
  routeEndpoint: string;
  callbackURL: string;
};
/**
 * Setup function of the Google Passport Strategy.
 * @param router The express router
 */
export function passportGoogleSetup(config: SBAuthGoogleConfig): boolean {
  try {
    passport.use(
      'google',
      new Strategy(
        {
          clientID: config.clientID,
          clientSecret: config.clientSecret,
          callbackURL: config.callbackURL,
        },
        async (accessToken: string, refreshToken: string, profile: passport.Profile, done: VerifyCallback) => {
          const displayName = profile.displayName;
          const email = profile.emails ? profile.emails[0].value : '';
          const picture = profile.photos ? profile.photos[0].value : '';
          const extras = {
            displayName: displayName ?? '',
            email: email ?? '',
            picture: picture ?? '',
          };
          const authRecord = await SBAuthDB.findOrAddAuth('google', profile.id, extras);
          if (authRecord != undefined) {
            done(null, authRecord);
          } else {
            done(null, false);
          }
        }
      )
    );
    console.log('Login> Google setup done');
    return true;
  } catch (error) {
    console.log('Login> Google failed setup', error);
    return false;
  }
}
