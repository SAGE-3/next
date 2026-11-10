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
 * The profile document id of the first configured admin who has logged in, or undefined.
 * Used to transfer the data of a deleted account.
 */
export async function firstAdminId(): Promise<string | undefined> {
  const email = (config.auth.admins || [])[0];
  if (!email) return undefined;
  const auths = await SAGEBase.Auth.findAuthsByEmail(email);
  return auths.find((a) => isAdmin(a))?.id;
}
