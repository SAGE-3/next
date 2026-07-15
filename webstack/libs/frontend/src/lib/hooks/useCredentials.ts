/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, useCallback } from 'react';

export type CredentialType = 'secretText' | 'usernamePassword' | 'sshPrivateKey';

export interface CredentialMetadata {
  id: string;
  ownerId: string;
  name: string;
  type: CredentialType;
  createdAt: number;
  updatedAt: number;
}

interface UseCredentialsResult {
  credentials: CredentialMetadata[];
  loading: boolean;
  refetch: () => void;
}

// type is optional: omitting it lists every credential the user owns,
// across all types (used by the credentials settings tab). Passing a type
// scopes the list to just that type (used by a consuming app's own picker,
// e.g. SSHTerminal only ever wants its 'sshPrivateKey' credentials).
export function useCredentials(type?: CredentialType): UseCredentialsResult {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchNonce, setRefetchNonce] = useState(0);

  const refetch = useCallback(() => setRefetchNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = type ? `/api/credentials?type=${type}` : '/api/credentials';
        const resp = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) return;
        const json = (await resp.json()) as CredentialMetadata[];
        if (!cancelled) setCredentials(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, refetchNonce]);

  return { credentials, loading, refetch };
}
