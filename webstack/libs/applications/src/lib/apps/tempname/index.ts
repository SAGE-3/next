/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { z } from 'zod';

// Define Zod schema for PollOption
const pollOptionSchema = z.object({
  id: z.string(),
  option: z.string(),
  votes: z.number(),
});

export type PollOption = z.infer<typeof pollOptionSchema>;

// Define Zod schema for PollData
const pollDataSchema = z.object({
  question: z.string(),
  options: z.array(pollOptionSchema),
});

export type PollData = z.infer<typeof pollDataSchema>;

const pollDataStateSchema = z.object({
  poll: pollDataSchema.nullable(),
});

export type state = z.infer<typeof pollDataStateSchema>;

export const init: Partial<state> = {
  poll: undefined,
};

export const name = 'Poll';

// Export the array schema
export const schema = pollDataSchema;
