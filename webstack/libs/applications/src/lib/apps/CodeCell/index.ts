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

///////
// JSON from zod
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]));
///////

export const schema = z.object({
  code: z.string(),
  execute: z.object({ name: z.string(), params: z.array(jsonSchema) }),
  output: z.string(),
});
export type state = z.infer<typeof schema>;

// import { SBJSON } from '@sage3/sagebase';
// export type state = {
//   code: string;
//   execute: { name: string; params: SBJSON[] };
//   output: string;
// };

export const init: Partial<state> = {
  code: 'x = 12',
  execute: {
    name: 'print',
    params: [
      { name: 'arg1', val: 42 },
      { name: 'arg2', val: 'toto' },
    ],
  },
  output: 'None',
};

export const name = 'CodeCell';
