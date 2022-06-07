/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as passport from 'passport';
import { readFileSync } from 'fs';

import { Strategy, ExtractJwt } from 'passport-jwt';
import { SBAuthDB } from '../SBAuthDatabase';

// Return payload from JWT check
type JWTPayload = {
  sub: string;
  name: string;
  admin: boolean;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
};

export type SBAuthJWTConfig = {
  issuer: string;
  audience: string;
  publicKey: string;
  routeEndpoint: string;
};

/**
 * Setup function of the Local Passport Strategy.
 * @param router The express router
 */
export function passportJWTSetup(config: SBAuthJWTConfig): boolean {
  try {
    const secretJWT = readFileSync(config.publicKey).toString();
    const opts = {
      // Get the token from the authorization header: bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secretJWT,
      issuer: config.issuer,
      audience: config.audience,
    };
    passport.use(
      'jwt',
      new Strategy(opts, async (payload: JWTPayload, done: any) => {
        if (opts.audience === payload.aud && opts.issuer === payload.iss) {
          const now = new Date();
          const expiration = new Date(payload.exp * 1000);
          // Check the expiration date of the token
          if (expiration.getTime() >= now.getTime()) {
            // Check the audience and issuer of the token
            if (payload.aud === opts.audience || payload.iss === opts.issuer) {
              const authRecord = await SBAuthDB.findOrAddAuth('jwt', payload.sub);
              console.log('JWT auth record:', authRecord);
              if (authRecord) {
                return done(null, authRecord);
              } else {
                return done(null, false);
              }
            } else {
              console.log('JWT> Bad user');
              return done(null, false);
            }
          } else {
            console.log('JWT> Expired:', payload.exp, now.getTime());
            return done(null, false);
          }
        } else {
          console.log('JWT> Wrong token:', payload.aud, payload.iss);
          return done(null, false);
        }
      })
    );
    console.log('JWT> Login setup done');
    return true;
  } catch (error) {
    console.log(error);
    console.log('JWT> Login failed');
    return false;
  }
}
