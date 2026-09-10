/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import ky, { HTTPError } from 'ky';

import { apiUrls } from '../config/urls';
import { USER_PROVIDER_NAME, userLLMPayload } from '../utils/userllm';
import {
  SError,
  AgentRoutes,
  HealthResponse,
  AskRequest,
  AskResponse,
  WebQuery,
  WebAnswer,
  ImageQuery,
  ImageAnswer,
  PDFQuery,
  PDFAnswer,
  WebScreenshot,
  WebScreenshotAnswer,
  IdeatorRoutes,
  IdeatorDimensionsRequest,
  IdeatorDimensionsResponse,
  IdeatorNodeRequest,
  IdeatorNodeResponse,
  IdeatorAbstractRequest,
  IdeatorAbstractResponse,
  IdeatorUserDimensionRequest,
  IdeatorUserDimensionResponse,
  IdeatorSummarizeRequest,
  IdeatorSummarizeResponse,
  IdeatorImageRequest,
  IdeatorImageResponse,
  IdeatorProseRequest,
  IdeatorProseResponse,
  ImageGenerationRoutes,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '@sage3/shared';

const AGENT_TIMEOUT_MS = 120 * 1000;
const IDEATOR_TIMEOUT_MS = 60 * 1000;

/**
 * Attach the user's own credentials when — and only when — the request names
 * their own provider. Every request carries a `model` field holding a provider
 * name; if it is anything other than the user's own, the payload is returned
 * untouched, so requests against server-configured providers are unchanged.
 */
export function withUserCredentials<T extends object>(data: T): T {
  if ((data as { model?: string }).model !== USER_PROVIDER_NAME) return data;
  const userllm = userLLMPayload();
  // Selected but no credentials stored: send as-is and let the backend report
  // the failure rather than silently pretending a different provider was meant
  if (!userllm) return data;
  return { ...data, userllm };
}

/**
 * Turn a failed response into a readable SError.
 *
 * The backend reports failures as `{ detail: ... }` (FastAPI's convention)
 * while SError carries `message`, so reading only `message` silently discards
 * the reason and leaves the caller with a bare status code.
 */
export async function toSError(error: HTTPError<Response>): Promise<SError> {
  try {
    const body = (await error.response.json()) as { message?: string; detail?: unknown };
    const detail = typeof body?.detail === 'string' ? body.detail : body?.detail ? JSON.stringify(body.detail) : undefined;
    const message = body?.message || detail;
    if (message) return { message };
  } catch (e) {
    // Body was not JSON — fall through to the status line
  }
  return { message: `${error.response.status} ${error.response.statusText}`.trim() };
}

async function agentPost<T>(path: string, data: object, timeoutMs = AGENT_TIMEOUT_MS, signal?: AbortSignal): Promise<T | SError> {
  try {
    return await ky.post<T>(path, { json: withUserCredentials(data), timeout: timeoutMs, signal }).json();
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { message: 'Cancelled' };
    }
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      return await toSError(error);
    }
    return { message: e instanceof Error ? e.message : 'Unknown error' };
  }
}

async function agentGet<T>(path: string): Promise<T | SError> {
  try {
    return await ky.get<T>(path).json();
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      return await toSError(error);
    }
    return { message: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── Agent (Chat) endpoints ───────────────────────────────────────────────────

export const seerAgents = {
  status: () => agentGet<HealthResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.status}`),
  ask: (data: AskRequest) => agentPost<AskResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.ask}`, data),
  summary: (data: AskRequest) => agentPost<AskResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.summary}`, data),
  web: (data: WebQuery) => agentPost<WebAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.web}`, data),
  webshot: (data: WebScreenshot) => agentPost<WebScreenshotAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.webshot}`, data),
  image: (data: ImageQuery) => agentPost<ImageAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.image}`, data),
  pdf: (data: PDFQuery) => agentPost<PDFAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.pdf}`, data),
};

// ─── Image generation ─────────────────────────────────────────────────────────

/**
 * Generic image generation, for any app that wants an image. The prompt is
 * sent as written. SageIdeator's brainstorming-specific image call is
 * seerIdeator.image below, and is not for general use.
 */
export const seerImage = {
  generate: (data: ImageGenerationRequest, signal?: AbortSignal) =>
    agentPost<ImageGenerationResponse>(`${apiUrls.ai.agents.base}${ImageGenerationRoutes.generate}`, data, IDEATOR_TIMEOUT_MS, signal),
};

// ─── Ideator endpoints ────────────────────────────────────────────────────────

export const seerIdeator = {
  dimensions: (data: IdeatorDimensionsRequest) =>
    agentPost<IdeatorDimensionsResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.dimensions}`, data, IDEATOR_TIMEOUT_MS),
  node: (data: IdeatorNodeRequest) =>
    agentPost<IdeatorNodeResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.node}`, data, IDEATOR_TIMEOUT_MS),
  abstract: (data: IdeatorAbstractRequest) =>
    agentPost<IdeatorAbstractResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.abstract}`, data, IDEATOR_TIMEOUT_MS),
  userDimension: (data: IdeatorUserDimensionRequest) =>
    agentPost<IdeatorUserDimensionResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.userDimension}`, data, IDEATOR_TIMEOUT_MS),
  summarize: (data: IdeatorSummarizeRequest) =>
    agentPost<IdeatorSummarizeResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.summarize}`, data, IDEATOR_TIMEOUT_MS),
  image: (data: IdeatorImageRequest, signal?: AbortSignal) =>
    agentPost<IdeatorImageResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.image}`, data, IDEATOR_TIMEOUT_MS, signal),
  prose: (data: IdeatorProseRequest) =>
    agentPost<IdeatorProseResponse>(`${apiUrls.ai.ideator.base}${IdeatorRoutes.prose}`, data, IDEATOR_TIMEOUT_MS),
};
