/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Typing library
import { z } from 'zod';

// SAGEBase base schema
export const SBSchema = z.object({
  _id: z.string(),
  _createdAt: z.number(),
  _updatedAt: z.number(),
  _updatedBy: z.string(),
  _createdBy: z.string(),
});

// Create the Typescript type
export type SBDoc = z.infer<typeof SBSchema>;
