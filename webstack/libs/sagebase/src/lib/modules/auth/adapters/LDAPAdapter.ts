/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as passport from 'passport';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LdapStrategy = require('passport-ldapauth');

import { SBAuthDB, AuthExtras } from '../SBAuthDatabase';

type LdapUserProfile = {
  dn?: string;
  uid?: string;
  sAMAccountName?: string;
  cn?: string;
  displayName?: string;
  mail?: string;
  memberOf?: string | string[];
};

export type SBAuthLDAPConfig = {
  url: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  groupMapping: {
    admin?: string;
    user?: string;
    spectator?: string;
  };
  defaultRole: string;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
};

/**
 * Resolve SAGE3 role from LDAP memberOf attribute using group mapping.
 * Checks in priority order: admin > user > spectator.
 * Returns defaultRole if no group matches.
 */
export function resolveRole(memberOf: string[], groupMapping: SBAuthLDAPConfig['groupMapping'], defaultRole: string): string {
  const normalizedMemberOf = memberOf.map((g) => g.toLowerCase());

  const priorityOrder: Array<'admin' | 'user' | 'spectator'> = ['admin', 'user', 'spectator'];

  for (const role of priorityOrder) {
    const groupDN = groupMapping[role];
    if (groupDN && normalizedMemberOf.includes(groupDN.toLowerCase())) {
      return role;
    }
  }

  return defaultRole;
}

/**
 * Setup function for the LDAP Passport Strategy.
 */
export function passportLDAPSetup(config: SBAuthLDAPConfig): boolean {
  try {
    passport.use(
      'ldapauth',
      new LdapStrategy(
        {
          server: {
            url: config.url,
            bindDN: config.bindDN,
            bindCredentials: config.bindCredentials,
            searchBase: config.searchBase,
            searchFilter: config.searchFilter,
            searchAttributes: ['dn', 'uid', 'cn', 'mail', 'displayName', 'memberOf', 'jpegPhoto', 'sAMAccountName'],
            tlsOptions: config.tlsOptions || { rejectUnauthorized: false },
          },
        },
        async (ldapUser: LdapUserProfile, done: (err: Error | null, user?: Express.User | false) => void) => {
          try {
            // Build a stable provider ID from the LDAP DN
            const providerId = ldapUser.dn || ldapUser.uid || ldapUser.sAMAccountName || '';
            const displayName = ldapUser.displayName || ldapUser.cn || ldapUser.uid || '';
            const email = ldapUser.mail || '';

            // Resolve role from memberOf
            const memberOf: string[] = Array.isArray(ldapUser.memberOf)
              ? ldapUser.memberOf
              : ldapUser.memberOf
                ? [ldapUser.memberOf]
                : [];

            const role = resolveRole(memberOf, config.groupMapping, config.defaultRole);

            const extras: AuthExtras = { displayName, email, picture: '', role };
            const authRecord = await SBAuthDB.findOrAddAuth('ldap', providerId, extras);

            if (authRecord) {
              done(null, authRecord);
            } else {
              done(null, false);
            }
          } catch (error) {
            console.error('LDAP> Error processing user:', error);
            done(error instanceof Error ? error : new Error(String(error)));
          }
        }
      )
    );

    return true;
  } catch (error) {
    console.error('LDAP> Failed setup:', error);
    return false;
  }
}
