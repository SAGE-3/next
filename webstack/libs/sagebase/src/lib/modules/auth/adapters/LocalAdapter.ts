/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as bcrypt from 'bcrypt';
import * as passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { SBAuthDB, AuthExtras } from '../SBAuthDatabase';

export type SBAuthLocalConfig = {
  routeEndpoint: string;
};

/**
 * Setup the Passport Local strategy.
 * Verifies username/password against bcrypt-hashed credentials stored in Redis.
 */
export function passportLocalSetup(): boolean {
  try {
    passport.use(
      new LocalStrategy(async (username: string, password: string, done: (err: unknown, user?: Express.User | false, options?: { message: string }) => void) => {
        try {
          const record = await SBAuthDB.getLocalUser(username);
          if (!record) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          const match = await bcrypt.compare(password, record.passwordHash);
          if (!match) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          const extras: AuthExtras = {
            displayName: record.displayName || username,
            email: record.email || '',
            picture: '',
          };
          const authRecord = await SBAuthDB.findOrAddAuth('local', username, extras);
          if (authRecord) {
            return done(null, authRecord);
          } else {
            return done(null, false, { message: 'Authentication failed' });
          }
        } catch (error) {
          return done(error);
        }
      })
    );

    return true;
  } catch (error) {
    console.error('Local Login> Failed setup', error);
    return false;
  }
}
