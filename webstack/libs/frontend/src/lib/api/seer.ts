/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import ky, { HTTPError } from 'ky';

import { apiUrls } from '../config/urls';
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
  MesonetRequest,
  MesonetResponse,
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
} from '@sage3/shared';

const AGENT_TIMEOUT_MS = 120 * 1000;
const IDEATOR_TIMEOUT_MS = 60 * 1000;

async function agentPost<T>(path: string, data: object, timeoutMs = AGENT_TIMEOUT_MS): Promise<T | SError> {
  try {
    return await ky.post<T>(path, { json: data, timeout: timeoutMs }).json();
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      const err: SError = await error.response.json();
      return err;
    }
    return { message: 'Unknown error' };
  }
}

async function agentGet<T>(path: string): Promise<T | SError> {
  try {
    return await ky.get<T>(path).json();
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      const err: SError = await error.response.json();
      return err;
    }
    return { message: 'Unknown error' };
  }
}

// ─── Agent (Chat) endpoints ───────────────────────────────────────────────────

export const seerAgents = {
  status: () =>
    agentGet<HealthResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.status}`),
  ask: (data: AskRequest) =>
    agentPost<AskResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.ask}`, data),
  summary: (data: AskRequest) =>
    agentPost<AskResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.summary}`, data),
  web: (data: WebQuery) =>
    agentPost<WebAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.web}`, data),
  webshot: (data: WebScreenshot) =>
    agentPost<WebScreenshotAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.webshot}`, data),
  image: (data: ImageQuery) =>
    agentPost<ImageAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.image}`, data),
  pdf: (data: PDFQuery) =>
    agentPost<PDFAnswer>(`${apiUrls.ai.agents.base}${AgentRoutes.pdf}`, data),
  mesonet: (data: MesonetRequest) =>
    agentPost<MesonetResponse>(`${apiUrls.ai.agents.base}${AgentRoutes.mesonet}`, data),
};

// ─── Ideator endpoints ────────────────────────────────────────────────────────

export const seerIdeator = {
  dimensions: (data: IdeatorDimensionsRequest) =>
    agentPost<IdeatorDimensionsResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.dimensions}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
  node: (data: IdeatorNodeRequest) =>
    agentPost<IdeatorNodeResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.node}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
  abstract: (data: IdeatorAbstractRequest) =>
    agentPost<IdeatorAbstractResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.abstract}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
  userDimension: (data: IdeatorUserDimensionRequest) =>
    agentPost<IdeatorUserDimensionResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.userDimension}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
  summarize: (data: IdeatorSummarizeRequest) =>
    agentPost<IdeatorSummarizeResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.summarize}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
  image: (data: IdeatorImageRequest) =>
    agentPost<IdeatorImageResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.image}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
  prose: (data: IdeatorProseRequest) =>
    agentPost<IdeatorProseResponse>(
      `${apiUrls.ai.ideator.base}${IdeatorRoutes.prose}`,
      data,
      IDEATOR_TIMEOUT_MS
    ),
};
