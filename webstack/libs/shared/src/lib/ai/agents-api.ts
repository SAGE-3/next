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
export type HealthResponse = {
  success: boolean;
};

// Ask request
export type AskRequest = {
  ctx: { previousQ: string; previousA: string; pos: number[]; roomId: string; boardId: string };
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
  ctx: { previousQ: string; previousA: string; pos: number[]; roomId: string; boardId: string };
  url: string;
  user: string;
  model: string;
  q: string;
  extras: 'links' | 'text' | 'images' | 'pdfs';
};

export type WebAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
};

export type WebScreenshot = {
  ctx: { previousQ: string; previousA: string; pos: number[]; roomId: string; boardId: string };
  url: string;
  user: string;
};
export type WebScreenshotAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
};

// Image request
export type ImageQuery = {
  ctx: { previousQ: string; previousA: string; pos: number[]; roomId: string; boardId: string };
  asset: string;
  user: string;
  model: string;
  q: string;
};
export type ImageAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
};

// PDF request
export type PDFQuery = {
  ctx: { previousQ: string; previousA: string; pos: number[]; roomId: string; boardId: string };
  asset: string;
  user: string;
  q: string;
};
export type PDFAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
};

// Code request
export type CodeRequest = {
  ctx: { previousQ: string; previousA: string; pos: number[]; roomId: string; boardId: string };
  id: string;
  user: string;
  location: string;
  q: string;
  model: string;
  method: string;
};
export type CodeResponse = {
  id: string;
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
  image: '/image',
  pdf: '/pdf',
  code: '/code',
} as const;
