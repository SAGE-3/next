/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';
import { Issuer, custom } from 'openid-client';
import { Strategy, VerifyCallback } from 'passport-openidconnect';

import { SBAuthDB } from '../SBAuthDatabase';

export type SBAuthKeycloakConfig = {
  // Full issuer URL including realm, e.g.:
  //   http://localhost:8080/realms/sage3
  //   https://keycloak.example.com/realms/my-realm
  // Keycloak exposes its OIDC discovery document at:
  //   {issuerURL}/.well-known/openid-configuration
  issuerURL: string;
  clientID: string;
  clientSecret?: string;
  routeEndpoint: string;
  callbackURL: string;
};

/**
 * Setup function for the Keycloak Passport strategy.
 *
 * Uses OpenID Connect dynamic discovery — the same mechanism as CILogon —
 * but with a configurable issuer URL so any Keycloak realm (or any other
 * standards-compliant OIDC provider) can be used without code changes.
 *
 * @param config  Keycloak connection settings from sage3-dev.hjson
 * @returns true on success, false if the discovery request fails
 */
export async function passportKeycloakSetup(config: SBAuthKeycloakConfig): Promise<boolean> {
  // Use the same generous timeout as the CILogon adapter
  custom.setHttpOptionsDefaults({ timeout: 10000 });

  // Fetch OIDC metadata from Keycloak's well-known discovery endpoint.
  // Keycloak automatically exposes this at {issuerURL}/.well-known/openid-configuration
  const issuer = await Issuer.discover(config.issuerURL).catch((err) => {
    console.log('Keycloak> Failed to fetch OIDC discovery document:', err);
  });

  if (!issuer) {
    console.log('Keycloak> Setup failed — could not reach issuer at', config.issuerURL);
    return false;
  }

  console.log('Keycloak> Discovered issuer:', issuer.issuer);

  const oidcConfig = {
    issuer: issuer.issuer,
    authorizationURL: issuer.authorization_endpoint,
    tokenURL: issuer.token_endpoint,
    userInfoURL: issuer.userinfo_endpoint,
    clientID: config.clientID,
    callbackURL: config.callbackURL,
  } as any;

  if (config.clientSecret) oidcConfig.clientSecret = config.clientSecret;

  // Register as 'keycloak' (not 'openidconnect') so this strategy can coexist
  // with a simultaneously enabled CILogon strategy, which also uses passport-openidconnect
  // but registers itself under the name 'openidconnect'.
  passport.use(
    'keycloak',
    new Strategy(
      oidcConfig,
      async (_issuer: string, profile: passport.Profile, _context: unknown, _refreshToken: unknown, done: VerifyCallback) => {
        const email = profile.emails ? profile.emails[0].value : '';
        // Keycloak often populates displayName; fall back to the email prefix if not
        const displayName = profile.displayName ? profile.displayName : email.split('@')[0];
        const picture = profile.photos ? profile.photos[0].value : '';

        const extras = {
          displayName: displayName ?? '',
          email: email ?? '',
          picture: picture ?? '',
        };

        const authRecord = await SBAuthDB.findOrAddAuth('keycloak', profile.id, extras);
        if (authRecord != undefined) {
          done(null, authRecord);
        } else {
          done(null, false);
        }
      }
    )
  );

  console.log('Keycloak> Setup done');
  return true;
}
