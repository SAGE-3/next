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

/**
 * The provider name used when a request carries the user's own credentials
 * rather than naming one of the server's configured providers. A request whose
 * `model` field holds this value is expected to carry a `userllm` block.
 */
export const USER_LLM_PROVIDER = 'my-own-key';

/**
 * A user's own OpenAI-compatible credentials, attached to an AI request when
 * they have chosen their own provider instead of one configured on the server.
 *
 * Present ONLY on those requests: a request naming a server provider is sent
 * exactly as before, with no `userllm` field at all.
 *
 * The backend should use these for that single request and never persist them.
 * `apiKey` is a bearer secret — it must be redacted from any request logging.
 */
export type UserLLMPayload = {
  /** The user's API key, valid for this request only. */
  apiKey: string;
  /** Optional OpenAI-compatible base URL; absent means the OpenAI default. */
  baseUrl?: string;
  /** The model to call, e.g. `gpt-4o`. */
  modelId: string;
};

// Request Types

// Health check request
export type HealthResponse = {
  success: boolean;
};

// Ask request
export type AskRequest = {
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
  id: string;
  user: string;
  location: string;
  q: string;
  model: string;
  appIds?: string[]; // source apps whose content the backend reads server-side
  intent?: string; // optional prompt template: summary|proscons|keywords|opinion|facts
};
export type AskResponse = {
  id: string;
  r: string;
  success: boolean;
  actions?: any[];
};

// Web request
export type WebQuery = {
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
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
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
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
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
  assets: string[];
  user: string;
  model: string;
  q: string;
};
export type ImageAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
  selected?: string[]; // asset ids the answer selects (filter/pick tasks)
};

// Image request
export type MesonetRequest = {
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
  user: string;
  q: string;
  url: string;
  currentTime: string;
};
export type MesonetResponse = {
  attributes: string[];
  stations: string[];
  chart_type: string[];
  summary: string;
  success: boolean;
  actions?: any[];
  start_date: string;
  end_date: string;
};

// PDF request
export type PDFQuery = {
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
  assetids: string[];
  user: string;
  model: string;
  q: string;
};
export type PDFAnswer = {
  r: string;
  success: boolean;
  actions?: any[];
};

// Code request
export type CodeRequest = {
  ctx: { previousQ: string[]; previousA: string[]; pos: number[]; roomId: string; boardId: string };
  id: string;
  user: string;
  location: string;
  q: string;
  model: string;
  method: string;
  appIds?: string[]; // source CodeEditor apps the backend reads server-side
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
  mesonet: '/mesonet',
} as const;
