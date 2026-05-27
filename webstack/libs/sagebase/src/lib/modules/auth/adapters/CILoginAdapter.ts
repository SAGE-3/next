/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';


import { Issuer, custom } from 'openid-client';
import { Strategy, VerifyCallback } from 'passport-openidconnect';

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
export async function passportCILogonSetup(config: SBAuthCILogonConfig) {
  // Increase timeout to 10 seconds
  custom.setHttpOptionsDefaults({ timeout: 10000 });
  // Get information from CILogon
  const ciLogon = await Issuer.discover(CILogonURL).catch(function (err) {
    console.log('CILogon> Failed to get CILogon information', err);
  });
  if (ciLogon) {
    console.log('CILogon> Received cilogon information', ciLogon.issuer);
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
        async (_issuer: string, profile: passport.Profile, _context: unknown, _refreshToken: unknown, done: VerifyCallback) => {
          const email = profile.emails ? profile.emails[0].value : '';
          const displayName = profile.displayName ? profile.displayName : email.split('@')[0];
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
    console.log('CILogon> Setup done');
    return true;
  } else {
    console.log('CILogon> Failed setup');
    return false;
  }
}
