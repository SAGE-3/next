/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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
  width: z.number(),
  height: z.number(),
  aspectRatio: z.number(),
  filename: z.string(),
  url: z.string(),
  sizes: z.array(ImageInfoSchema),
});
// Create the Typescript type
export type ExtraImageType = z.infer<typeof ExtraImageSchema>;

// information for derived videos
export const ExtraVideoSchema = z.object({
  width: z.number(),
  height: z.number(),
  aspectRatio: z.number(),
  filename: z.string(),
  url: z.string(),
  duration: z.string(),
  birate: z.string(),
  framerate: z.number(),
  compressor: z.string(),
  audioFormat: z.string(),
  rotation: z.number(),
});
// Create the Typescript type
export type ExtraVideoType = z.infer<typeof ExtraVideoSchema>;

// information for derived PDF: array of pages with array of images
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
  dateCreated: z.string(),
  dateAdded: z.string(),
  mimetype: z.string(),
  destination: z.string(),
  size: z.number(),
  metadata: z.string().optional(),
  derived: z.union([ExtraImageSchema, ExtraPDFSchema, ExtraVideoSchema]).optional(),
});

// Create the Typescript type
export type AssetSchema = z.infer<typeof schema>;

// TS type for sagebase
export type Asset = SBDoc & { data: AssetSchema };
