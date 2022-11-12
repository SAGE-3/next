/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { PassportStatic, Profile } from 'passport';
const passport: PassportStatic = require('passport');
//import { Strategy, VerifyCallback } from 'passport-openidconnect';
import { Issuer } from 'openid-client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Strategy = require('passport-openidconnect').Strategy;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VerifyCallback = require('passport-openidconnect').VerifyCallback;
import { SBAuthDB } from '../SBAuthDatabase';

export type SBAuthCILogonConfig = {
  clientID: string;
  clientSecret?: string;
  routeEndpoint: string;
  callbackURL: string;
};

// URL to query for information
const CILogonURL = 'https://cilogon.org/.well-known/openid-configuration';

/**
 * Setup function of the CILogon Passport Strategy.
 * @param router The express router
 */
export function passportCILogonSetup(config: SBAuthCILogonConfig): boolean {
  try {
    // Get information from CILogon
    Issuer.discover(CILogonURL).then(function (ciLogon) {
      // Pass it along with site specific info
      const cilongconfig = {
        // cilogon info
        issuer: ciLogon.issuer,
        authorizationURL: ciLogon.authorization_endpoint,
        tokenURL: ciLogon.token_endpoint,
        userInfoURL: ciLogon.userinfo_endpoint,

        // site specific info
        clientID: config.clientID,
        callbackURL: config.callbackURL,
      } as any;
      // add the secret if specified
      if (config.clientSecret) cilongconfig.clientSecret = config.clientSecret;

      passport.use(
        'openidconnect',
        new Strategy(
          cilongconfig,
          async (_issuer: string, profile: Profile, _context: unknown, _refreshToken: unknown, done: typeof VerifyCallback) => {
            const displayName = profile.displayName;
            const email = profile.emails ? profile.emails[0].value : '';
            const picture = profile.photos ? profile.photos[0].value : '';
            const extras = {
              displayName: displayName ?? '',
              email: email ?? '',
              picture: picture ?? '',
            };
            const authRecord = await SBAuthDB.findOrAddAuth('cilogon', profile.id, extras);
            if (authRecord != undefined) {
              done(null, authRecord);
            } else {
              done(null, false);
            }
          }
        )
      );
    });
    console.log('CILogon Login> Setup done');
    return true;
  } catch (error) {
    console.log('CILogon Login> Failed setup', error);
    return false;
  }
}
