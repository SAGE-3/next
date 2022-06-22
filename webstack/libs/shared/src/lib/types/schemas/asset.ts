/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Typing library
import { z } from 'zod';
import { SBDoc } from './SBSchema';


// information for derived images
export const ExtraImageSchema = z.object({
  fullSize: z.string(),
  aspectRatio: z.number(),
  sizes: z.record(z.string()),
});
// Create the Typescript type
export type ExtraImageType = z.infer<typeof ExtraImageSchema>;

/**
 * @typedef {object} AssetSchema
 * Defines the Schema for the AssetModel.
 */
export const AssetSchema = z.object({
  file: z.string(),
  owner: z.string(),
  originalfilename: z.string(),
  path: z.string(),
  dateAdded: z.string(),
  mimetype: z.string(),
  destination: z.string(),
  size: z.number(),
  metadata: z.string().optional(),
  derived: ExtraImageSchema.optional(),
});

// Create the Typescript type
export type AssetType = z.infer<typeof AssetSchema>;

// TS type for sagebase
export type AssetSB = SBDoc & { data: AssetType };
