/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Request Return Type
export type AiQueryRequest = {
  input: string;
  model: string;
};

export type AiQueryResponse = {
  success: boolean;
  output?: string;
  error_message?: string;
};

export type AiStatusResponse = {
  onlineModels: string[];
};
