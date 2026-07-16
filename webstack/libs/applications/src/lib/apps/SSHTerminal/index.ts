/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

export const schema = z.object({
  host: z.string(),
  port: z.number(),
  credentialId: z.string(),
  ownerId: z.string(),
  controllerId: z.string().optional(),
  sessionName: z.string().optional(),
  connected: z.boolean(),
  // Owner's default for whether control is shared (private by default). The live
  // shared/private state is relay-authoritative; this only seeds it on connect.
  shareByDefault: z.boolean().optional(),
  // When set, the owner has locked the terminal to this board size — it no longer
  // follows window resizes and any other resize is reverted. Null/absent = follow
  // the shared window (the default).
  sizeLock: z.object({ width: z.number(), height: z.number() }).nullable().optional(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  host: '',
  port: 22,
  credentialId: '',
  ownerId: '',
  connected: false,
  executeInfo: { executeFunc: '', params: {} },
};

export const name = 'SSHTerminal';
