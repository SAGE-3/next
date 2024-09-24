/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Base Types
export type SError = {
  message: string;
};

// Request Types

// Health check request
export type HealthRequest = {
  // empty
};
export type HealthResponse = {
  success: boolean;
};

// Ask request
export type AskRequest = {
  ctx: { prompt: string; pos: number[]; roomId: string; boardId: string };
  id: string;
  user: string;
  location: string;
  q: string;
  model: string;
};
export type AskResponse = {
  id: string;
  r: string;
  success: boolean;
  actions?: any[];
};

// Web request
export type WebQuery = {
  ctx: { prompt: string; pos: number[]; roomId: string; boardId: string };
  url: string;
  user: string;
};
export type WebAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
};

// Agent routes
export const AgentRoutes = {
  status: '/status',
  ask: '/ask',
  summary: '/summary',
  web: '/web',
  webshot: '/webshot',
} as const;
