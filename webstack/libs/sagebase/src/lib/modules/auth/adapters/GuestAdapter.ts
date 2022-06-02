/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as passport from 'passport';

import { SBAuthDB } from '../SBAuthDatabase';
import { Strategy } from 'passport-local';
import { v4 } from 'uuid';

export type SBAuthGuestConfig = {
  routeEndpoint: string;
};

/**
 * Setup function of the Local Passport Strategy.
 * @param router The express router
 */
export function passportGuestSetup(): boolean {
  try {
    passport.use(
      'guest',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Strategy(async (username: string, password: string, done: any) => {
        const providerId = v4();
        const authRecord = await SBAuthDB.findOrAddAuth('guest', providerId);
        if (authRecord) {
          done(null, authRecord);
        } else {
          done(null, false);
        }
      })
    );
    console.log('Guest Login> Setup done');
    return true;
  } catch (error) {
    console.log(error);
    console.log('Guest Login> Failed to Connect');
    return false;
  }
}
