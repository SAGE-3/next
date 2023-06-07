/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';
import * as jwt from 'jsonwebtoken';
// @ts-ignore
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

/**
 * Setup function of the Google Passport Strategy.
 * @param router The express router
 */
export function passportAppleSetup(config: SBAuthAppleConfig): boolean {
  try {
    passport.use(
      // @ts-ignore
      new AppleStrategy(
        {
          clientID: config.clientID,
          teamID: config.teamID,
          keyID: config.keyID,
          callbackURL: config.callbackURL,
          routeEndpoint: config.routeEndpoint,
          privateKeyLocation: config.privateKeyLocation,
          passReqToCallback: true,
          scope: 'email name',
        },
        async (req: any, accessToken: string, refreshToken: string, idToken: any, profile: any, verified: Function) => {
          const decoded = jwt.decode(idToken, { json: true });
          if (decoded) {
            const id = decoded.sub!;
            // profile only on first login ever
            let user;
            if (req.body && req.body.user) {
              user = JSON.parse(req.body.user);
            }
            const displayName = user ? user.name.firstName + ' ' + user.name.lastName : idToken.sub;
            const email = user ? user.email : decoded.email || '';
            const extras = {
              displayName: displayName ?? '',
              email: email ?? '',
              picture: '',
            };
            const authRecord = await SBAuthDB.findOrAddAuth('apple', id, extras);
            if (authRecord != undefined) {
              verified(null, authRecord);
            } else {
              verified(null, undefined);
            }
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
