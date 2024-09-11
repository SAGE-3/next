/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

export type AiStatusResponse = {
  onlineModels: any[];
};
// Request Return Types
export type AiQueryResponse = {
  success: boolean;
  output?: string;
  error_message?: string;
};

export type AiQueryRequest = {
  input: string;
  model: string;
  max_new_tokens?: number;
  app_id?: string;
};
export type AiImageQueryRequest = {
  assetid: string;
  model: string;
  filename?: string;
  roomid?: string;
};

export type AiJSONQueryResponse = {
  success: boolean;
  data?: any;
  error_message?: string;
};

export type AgentQueryType = {
  ctx: { prompt: string; pos: number[]; roomId: string; boardId: string };
  id: string;
  user: string;
  location: string;
  q: string;
  model: string;
};

export type AgentQueryResponse = {
  id: string;
  r: string;
  success: boolean;
  actions?: any[];
};
