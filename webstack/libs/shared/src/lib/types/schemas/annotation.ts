/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

/**
 * @typedef {object} AnnotationSchema
 * Defines the Schema for the AnnotationModel.
 */
const schema = z.object({
  // The lines on the board
  whiteboardLines: z.array(z.any()),
});

export type AnnotationSchema = z.infer<typeof schema>;

export type Annotation = SBDoc & { data: AnnotationSchema };
