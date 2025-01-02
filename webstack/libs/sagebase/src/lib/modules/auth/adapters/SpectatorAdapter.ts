/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';
import { Strategy } from 'passport-local';
import { v4 } from 'uuid';

import { SBAuthDB } from '../SBAuthDatabase';

export type SBAuthSpectatorConfig = {
  routeEndpoint: string;
};

/**
 * Setup function of the Local Passport Strategy.
 * @param router The express router
 */
export function passportSpectatorSetup(): boolean {
  try {
    passport.use(
      'spectator',
      new Strategy(async (username: string, password: string, done) => {
        const providerId = v4();
        const extras = { displayName: '', email: '', picture: '' };
        const authRecord = await SBAuthDB.findOrAddAuth('spectator', providerId, extras);
        if (authRecord) {
          done(null, authRecord);
        } else {
          done(null, false);
        }
      })
    );
    console.log('Login> Spectator setup done');
    return true;
  } catch (error) {
    console.log(error);
    console.log('Login> Spectator failed to Connect');
    return false;
  }
}
