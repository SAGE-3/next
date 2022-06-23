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

export const ImageInfoSchema = z.object({
  url: z.string(),
  format: z.string(),
  size: z.number(),
  width: z.number(),
  height: z.number(),
  channels: z.number(),
  premultiplied: z.boolean(),
});
// Create the Typescript type
export type ImageInfoType = z.infer<typeof ImageInfoSchema>;

// information for derived images
export const ExtraImageSchema = z.object({
  fullSize: z.string(),
  aspectRatio: z.number(),
  filename: z.string(),
  url: z.string(),
  sizes: z.array(ImageInfoSchema),
});
// Create the Typescript type
export type ExtraImageType = z.infer<typeof ExtraImageSchema>;

// information for derived PDF:
//   array of pages with array of images
export const ExtraPDFSchema = z.array(z.array(ImageInfoSchema));
// Create the Typescript type
export type ExtraPDFType = z.infer<typeof ExtraPDFSchema>;

/**
 * @typedef {object} AssetSchema
 * Defines the Schema for the AssetModel.
 */
const schema = z.object({
  file: z.string(),
  owner: z.string(),
  room: z.string(),
  originalfilename: z.string(),
  path: z.string(),
  dateAdded: z.string(),
  mimetype: z.string(),
  destination: z.string(),
  size: z.number(),
  metadata: z.string().optional(),
  derived: z.union([ExtraImageSchema, ExtraPDFSchema]).optional(),
});

// Create the Typescript type
export type AssetSchema = z.infer<typeof schema>;

// TS type for sagebase
export type Asset = SBDoc & { data: AssetSchema };
