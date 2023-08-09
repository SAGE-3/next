/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

export const KernelInfoSchema = z.object({
  kernel_id: z.string(),
  room: z.string(),
  board: z.string(),
  name: z.string(),
  alias: z.string(),
  is_private: z.boolean(),
  owner: z.string(),
});

export type KernelInfo = z.infer<typeof KernelInfoSchema>;
