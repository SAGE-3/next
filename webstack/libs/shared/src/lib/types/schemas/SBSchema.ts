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
