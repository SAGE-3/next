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

// CILogon's OpenID Connect discovery document
const CILogonURL = 'https://cilogon.org/.well-known/openid-configuration';

/**
 * Setup function of the CILogon Passport Strategy.
 * The login route requests the scopes 'openid email' (see SBAuth): CILogon rejects any
 * scope the client was not registered with, and the 'profile' scope is not needed.
 * Without it the display name is the start of the email address.
 * @param config The CILogon section of the server configuration
 * @returns true when the strategy is ready
 */
export async function passportCILogonSetup(config: SBAuthCILogonConfig): Promise<boolean> {
  // Increase timeout to 10 seconds
  custom.setHttpOptionsDefaults({ timeout: 10000 });
  // Get the endpoints from CILogon
  const ciLogon = await Issuer.discover(CILogonURL).catch((err) => {
    console.log('CILogon> Failed to get CILogon information', err);
  });
  if (!ciLogon) {
    console.log('CILogon> Failed setup');
    return false;
  }
  console.log('CILogon> Received cilogon information', ciLogon.issuer);

  const options = {
    // CILogon endpoints
    issuer: ciLogon.issuer,
    authorizationURL: ciLogon.authorization_endpoint,
    tokenURL: ciLogon.token_endpoint,
    userInfoURL: ciLogon.userinfo_endpoint,
    // Site specific: the secret is left out for a public client
    clientID: config.clientID,
    callbackURL: config.callbackURL,
    ...(config.clientSecret ? { clientSecret: config.clientSecret } : {}),
  } as any;

  passport.use(
    'openidconnect',
    new Strategy(options, async (_issuer: string, profile: passport.Profile, _context: object, _idToken: unknown, done: VerifyCallback) => {
      const email = profile.emails?.[0]?.value ?? '';
      const extras = {
        displayName: profile.displayName || email.split('@')[0],
        email,
        picture: profile.photos?.[0]?.value ?? '',
      };
      const authRecord = await SBAuthDB.findOrAddAuth('cilogon', profile.id, extras);
      done(null, authRecord ?? false);
    }),
  );
  console.log('CILogon> Setup done');
  return true;
}
