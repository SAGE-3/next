/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import { z } from 'zod';

/**
 * SAGE3 application: Chat
 * created by: SAGE3 Team
 */

export const schema = z.object({
  uploaded: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.string(),
      uploadDate: z.number(),
      uploadedBy: z.string()
  })
),
  
  messages: z
    .object({
      id: z.string(),
      creationDate: z.number(),
      type: z.string(),
      payload: z.string(),
      userName: z.string(),
      userId: z.string(),
      source: z.string(),
    })
    .array(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  uploaded: [
  ],
    messages: [
    {
      id: 'starting',
      creationDate: Date.now(),
      userName: 'Docusage',
      type: 'server',
      payload: 'Hi. This is Sage Intelligence. How may I help you today?',
      userId: '',
      source: '',
    },
  ],
};

export const name = 'SageIntelligence';
