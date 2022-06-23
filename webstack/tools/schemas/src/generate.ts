/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import * as path from 'path';
import zodToJsonSchema from 'zod-to-json-schema';

import * as fs from 'fs';

// Import SAGE3 schemas
import { SBSchema } from '../../../libs/shared/src/lib/types/schemas';
// Import an app
import { schema } from '../../../libs/applications/src/lib/apps/Stickie/';

// TS type for sagebase
const SAGEschema = SBSchema.extend({ data: schema });

const app = 'Stickie';

const jsonSchema = zodToJsonSchema(SAGEschema, {
  name: app,
  target: 'jsonSchema7',
});

const folder = 'output';
fs.writeFile(path.join(folder, app + '-schema.json'), JSON.stringify(jsonSchema, null, 2), (err) => {
  if (err) throw err;
  console.log('Spec saved: openapi.json');
});
