/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGEBase, SBAuthSchema } from '@sage3/sagebase';
import { config } from '../config';

// Logins whose email comes from the identity provider. Guest, spectator and
// JWT service logins never count as admins.
const PROVIDERS_WITH_EMAIL = ['google', 'apple', 'cilogon', 'keycloak', 'ldap'];

/**
 * Is this login one of the server admins (`auth.admins` in the configuration)?
 * Uses the email of the auth record, set by the identity provider at login,
 * never the email of the user's profile document, which the user can edit.
 */
export function isAdmin(auth: SBAuthSchema | undefined): boolean {
  if (!auth?.email || !PROVIDERS_WITH_EMAIL.includes(auth.provider)) return false;
  return (config.auth.admins || []).includes(auth.email);
}

/**
 * The logins of the configured admins, in the order of `auth.admins`.
 * Used to find the account that receives the data of a deleted account.
 * Throws when the login records can not be searched.
 */
export async function adminLogins(): Promise<SBAuthSchema[]> {
  const logins: SBAuthSchema[] = [];
  for (const email of config.auth.admins || []) {
    const auths = await SAGEBase.Auth.findAuthsByEmail(email);
    logins.push(...auths.filter((a) => isAdmin(a)));
  }
  return logins;
}
