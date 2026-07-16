/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

export type ConnectParams = {
  host: string;
  port: number;
  ownerId: string;
  credentialId?: string;
  sessionName?: string;
  newCredential?: { name: string; value: { type: 'sshPrivateKey'; username: string; privateKey: string; passphrase?: string } };
};

export type ConnectResult =
  | { success: true; credentialId: string }
  | { success: false; error: 'auth_failed' | 'unreachable' | 'tmux_failed' | 'credential_unavailable' | 'session_not_found' };

// A tmux session name flows into a shell command over SSH. Restrict it to a
// safe charset so it can never be used for command injection.
export function isValidSessionName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name);
}

// Whether a host (and port) is permitted by the server's SSH allowlist. An
// empty list denies everything (secure-by-default). A bare `host` entry allows
// any port; a `host:port` entry pins the port. Host compare is case-insensitive.
export function isHostAllowed(host: string, port: number | string, allowedHosts: string[]): boolean {
  if (!allowedHosts || allowedHosts.length === 0) return false;
  const h = String(host).toLowerCase();
  const p = String(port);
  return allowedHosts.some((entry) => {
    const [eh, ep] = entry.toLowerCase().split(':');
    if (eh !== h) return false;
    return ep === undefined || ep === p;
  });
}
