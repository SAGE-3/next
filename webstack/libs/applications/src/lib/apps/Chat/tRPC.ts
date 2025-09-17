/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Ky for HTTP requests
import ky, { HTTPError } from 'ky';

import { apiUrls } from '@sage3/frontend';
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
} from '@sage3/shared';

/**
 * Makes the actual RPC call using ky library
 * @param mth string endpoint name
 * @param data object data to send
 * @returns
 */
const makeRpcPost = async (mth: string, data: object) => {
  try {
    const base = apiUrls.ai.agents.base;
    const response = await ky.post<Response>(`${base}${mth}`, { json: data, timeout: 120 * 1000 }).json();
    return response;
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      const err: SError = await error.response.json();
      return err;
    } else {
      return { message: 'Unknown error' };
    }
  }
};
const makeRpcGet = async (mth: string) => {
  try {
    const base = apiUrls.ai.agents.base;
    const response = await ky.get<Response>(`${base}${mth}`).json();
    return response;
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      const err: SError = await error.response.json();
      return err;
    } else {
      return { message: 'Unknown error' };
    }
  }
};

/**
 * Check the health of the agent server
 * @param mth string endpoint name
 * @param data SumRequest payload
 * @returns
 */
export const callStatus = async () => {
  return makeRpcGet(AgentRoutes.status) as Promise<HealthResponse | SError>;
};
export const callMesonet = async (data: MesonetRequest) => {
  return makeRpcPost(AgentRoutes.mesonet, data) as Promise<MesonetResponse | SError>;
};
export const callAsk = async (data: AskRequest) => {
  return makeRpcPost(AgentRoutes.ask, data) as Promise<AskResponse | SError>;
};
export const callSummary = async (data: AskRequest) => {
  return makeRpcPost(AgentRoutes.summary, data) as Promise<AskResponse | SError>;
};
export const callWeb = async (data: WebQuery) => {
  return makeRpcPost(AgentRoutes.web, data) as Promise<WebAnswer | SError>;
};
export const callWebshot = async (data: WebScreenshot) => {
  return makeRpcPost(AgentRoutes.webshot, data) as Promise<WebScreenshotAnswer | SError>;
};
export const callImage = async (data: ImageQuery) => {
  return makeRpcPost(AgentRoutes.image, data) as Promise<ImageAnswer | SError>;
};
export const callPDF = async (data: PDFQuery) => {
  return makeRpcPost(AgentRoutes.pdf, data) as Promise<PDFAnswer | SError>;
};
export const callCode = async (data: AskRequest) => {
  return makeRpcPost(AgentRoutes.code, data) as Promise<AskResponse | SError>;
};
