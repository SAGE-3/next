/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: SageIdeator
 * A design-space exploration tool inspired by Luminate.
 * Generates multi-dimensional AI responses and arranges them in a force-directed diagram.
 */

const SageDimensionSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['categorical', 'ordinal']),
  values: z.array(z.string()),
});

const SageNodeSchema = z.object({
  ID: z.string(),
  Title: z.string(),
  Summary: z.string(),
  Keywords: z.array(z.string()),
  Steps: z.array(z.string()),
  Result: z.string(),
  Structure: z.string(),
  Dimension: z.object({
    categorical: z.record(z.string()),
    ordinal: z.record(z.string()),
  }),
  IsMyFav: z.boolean(),
  imageUrl: z.string().optional(),
});

const QAEntrySchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  nodeTitle: z.string(),
  question: z.string(),
  answer: z.string(),
  userId: z.string(),
  userName: z.string(),
  timestamp: z.number(),
});

export const schema = z.object({
  apiKey: z.string(),
  model: z.string(),
  batchSize: z.number(),
  numDimensions: z.number(),
  status: z.enum(['idle', 'generating_dimensions', 'generating_responses', 'ready']),
  statusMessage: z.string(),
  prompt: z.string(),
  dimensions: z.array(SageDimensionSchema),
  nodes: z.array(SageNodeSchema),
  qa: z.array(QAEntrySchema).default([]),
  pdfContext: z.object({ filename: z.string(), text: z.string() }).optional(),
  favorites: z.record(z.string(), z.boolean()).default({}),
  chatHistory: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      userName: z.string(),
      userId: z.string(),
      timestamp: z.number(),
      // Snapshot of the idea space generated from this prompt
      nodes: z.array(SageNodeSchema).default([]),
      dimensions: z.array(SageDimensionSchema).default([]),
      // Branch provenance — set when this entry was branched from a node
      parentEntryId: z.string().optional(),
      parentNodeTitle: z.string().optional(),
      // Image attached to this prompt (base64 data URL)
      imageUrl: z.string().optional(),
      // PDF document used as context for this prompt
      pdfFilename: z.string().optional(),
    }),
  ),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  apiKey: '',
  model: 'gpt-4o-mini',
  batchSize: 8,
  numDimensions: 2,
  status: 'idle',
  statusMessage: '',
  prompt: '',
  dimensions: [],
  nodes: [],
  qa: [],
  favorites: {},
  chatHistory: [],
};

export const name = 'SageIdeator';
