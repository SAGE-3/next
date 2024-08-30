/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AiQueryResponse } from '@sage3/shared';

export abstract class AiModel {
  // Name of model
  abstract name: string;
  // Check if this AiModel is healthy to use
  abstract health(): Promise<boolean>;
  // The express router for this AiModel
  abstract query(input: string): Promise<AiQueryResponse>;
}
