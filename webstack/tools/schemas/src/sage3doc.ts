/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// @ts-ignore
import { JSONSchemaMarkdown } from 'json-schema-md-doc';

export class SAGE3Doc extends JSONSchemaMarkdown {
  footer = '';
  constructor() {
    super();
    this.footer = '';
  }
  load(schema: any) {
    super.load(schema);
  }
  generate() {
    return super.generate();
  }
  writePath(level: number, path: string) {
    // super.writePath(level, path);
  }
  writeAdditionalItems(bool: boolean, level: number) {
    if (super.notEmpty(bool)) {
      if (bool) {
        // this.writeLine('This schema <u>does not</u> accept additional items.', level);
      } else {
        super.writeLine('This schema accepts additional items.', level);
      }
    }
  }
  writeAdditionalProperties(bool: boolean, level: number) {
    if (super.notEmpty(bool)) {
      if (!bool) {
        // this.writeLine("This schema <u>does not</u> accept additional properties.", level);
      } else {
        super.writeLine('This schema accepts additional properties.', level);
      }
    }
  }
}
