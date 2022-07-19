/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: CodeCell
 * created by: SAGE3 team
 */
import { z } from 'zod';
import { png_sample } from './sampleData/png_sample';
import { codeSample } from './sampleData/codeSample';
import { sample1 } from './sampleData/sample1';
import { sample2 } from './sampleData/sample2';
import { sample3 } from './sampleData/sample3';

///////
// JSON from zod
// const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
// type Literal = z.infer<typeof literalSchema>;
// type Json = Literal | { [key: string]: Json } | Json[];
// const jsonSchema: z.ZodType<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]));
///////

// import { SBJSON } from '@sage3/sagebase';
// export type state = {
//   code: string;
//   execute: { name: string; params: SBJSON[] };
//   output: string;
// };

    // code: str
    // output: str
    // output_type: str # "ex. text/plain, stdout, html, etc"
    // executeInfo: ExecuteInfo

const executeInfoSchema = z.object({
  executeFunc: z.string(),
  params: z.record(z.any()),
});

const outputSchema = z.object({
  name: z.optional(z.string()),
  data: z.optional(z.record(z.any())),
  metadata: z.optional(z.record(z.any())),
  output_type: z.optional(z.string()),
  text: z.optional(z.array(z.string())),
  execution_count: z.optional(z.number()),
  traceback: z.optional(z.array(z.string()))
});

export const cellSchema = z.object({
  cell_type: z.optional(z.string()),
  execution_count: z.optional(z.number()),
  metadata: z.object({
    scrolled: z.optional(z.boolean()),
    collapsed: z.optional(z.boolean()),
    jupyter: z.optional(
      z.object({
        source_hidden: z.optional(z.boolean()),
        outputs_hidden: z.optional(z.boolean()),
      })
    ),
  }),
  outputs: z.optional(z.array(outputSchema)),
  source: z.optional(z.array(z.string())),
});

export const schema = z.object({
  code: z.string(),
  output: z.string(),
  output_type: z.string(),
  history: z.record(z.any()),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
  cells: z.optional(z.array(cellSchema)),
});

export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type outputType = z.infer<typeof outputSchema>;
export type cellType = z.infer<typeof cellSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  output: '',
  output_type: '',
  executeInfo: { executeFunc: 'resize_on_load', params: {} } as executeInfoType,
  // cells: [png_sample] as cellType[],
  // cells: sample1.cells as cellType[],
  // cells: sample2.cells as cellType[],
  // cells: sample3.content.cells as any,
  cells: []
};

export const name = 'CodeCell';