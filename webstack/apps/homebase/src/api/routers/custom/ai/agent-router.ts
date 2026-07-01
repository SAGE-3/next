/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { config } from 'apps/homebase/src/config';

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
  ImageGenerationRoutes,
} from '@sage3/shared';

// Define a general RPC handler type
type RpcHandlerGet<Response> = () => (Response | SError) | Promise<Response | SError>;
type RpcHandlerPost<Request, Response> = (req: Request) => (Response | SError) | Promise<Response | SError>;

// Index the list of handlers with string keys used as route names
interface HandlerStore {
  [key: string]: { func: RpcHandlerGet<any> | RpcHandlerPost<any, any>; method: 'POST' | 'GET' };
}

async function fetchGet(url: string) {
  return fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => res.json());
}
async function fetchPost(url: string, data: object) {
  // return await ky.post(url, { json: data }).json();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error('fetchPost> Error', err);
      return { message: 'Error' };
    });
}

// Forward functions to the agents
const statusHandler: RpcHandlerGet<HealthResponse> = () => {
  const route = AgentRoutes.status;
  return fetchGet(`${config.agents.url}${route}`);
};
const askHandler: RpcHandlerPost<AskRequest, AskResponse> = (req) => {
  const route = AgentRoutes.ask;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const codeHandler: RpcHandlerPost<AskRequest, AskResponse> = (req) => {
  const route = AgentRoutes.code;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const summaryHandler: RpcHandlerPost<AskRequest, AskResponse> = (req) => {
  const route = AgentRoutes.summary;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const webHandler: RpcHandlerPost<WebQuery, WebAnswer> = (req) => {
  const route = AgentRoutes.web;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const webshotHandler: RpcHandlerPost<WebScreenshot, WebScreenshotAnswer> = (req) => {
  const route = AgentRoutes.webshot;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const imageHandler: RpcHandlerPost<ImageQuery, ImageAnswer> = (req) => {
  const route = AgentRoutes.image;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const pdfHandler: RpcHandlerPost<PDFQuery, PDFAnswer> = (req) => {
  const route = AgentRoutes.pdf;
  return fetchPost(`${config.agents.url}${route}`, req);
};
const mesonetHandler: RpcHandlerPost<MesonetRequest, MesonetResponse> = (req) => {
  const route = AgentRoutes.mesonet;
  return fetchPost(`${config.agents.url}${route}`, req);
};

// Ideator handlers — forwarded to seer under /ideator/...
const ideatorDimensionsHandler: RpcHandlerPost<IdeatorDimensionsRequest, IdeatorDimensionsResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.dimensions}`, req);
const ideatorNodeHandler: RpcHandlerPost<IdeatorNodeRequest, IdeatorNodeResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.node}`, req);
const ideatorAbstractHandler: RpcHandlerPost<IdeatorAbstractRequest, IdeatorAbstractResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.abstract}`, req);
const ideatorUserDimensionHandler: RpcHandlerPost<IdeatorUserDimensionRequest, IdeatorUserDimensionResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.userDimension}`, req);
const ideatorSummarizeHandler: RpcHandlerPost<IdeatorSummarizeRequest, IdeatorSummarizeResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.summarize}`, req);
const ideatorImageHandler: RpcHandlerPost<IdeatorImageRequest, IdeatorImageResponse> = (req) =>
  fetchPost(`${config.agents.url}${ImageGenerationRoutes.generate}`, req);
const ideatorProseHandler: RpcHandlerPost<IdeatorProseRequest, IdeatorProseResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.prose}`, req);

// List all the handlers
const handlers: HandlerStore = {};
handlers[AgentRoutes.status] = { func: statusHandler, method: 'GET' };
handlers[AgentRoutes.ask] = { func: askHandler, method: 'POST' };
handlers[AgentRoutes.summary] = { func: summaryHandler, method: 'POST' };
handlers[AgentRoutes.web] = { func: webHandler, method: 'POST' };
handlers[AgentRoutes.webshot] = { func: webshotHandler, method: 'POST' };
handlers[AgentRoutes.image] = { func: imageHandler, method: 'POST' };
handlers[AgentRoutes.pdf] = { func: pdfHandler, method: 'POST' };
handlers[AgentRoutes.mesonet] = { func: mesonetHandler, method: 'POST' };
handlers[AgentRoutes.code] = { func: codeHandler, method: 'POST' };
// Ideator routes mounted under /ideator/... to avoid collisions with agent routes
handlers[`/ideator${IdeatorRoutes.dimensions}`] = { func: ideatorDimensionsHandler, method: 'POST' };
handlers[`/ideator${IdeatorRoutes.node}`] = { func: ideatorNodeHandler, method: 'POST' };
handlers[`/ideator${IdeatorRoutes.abstract}`] = { func: ideatorAbstractHandler, method: 'POST' };
handlers[`/ideator${IdeatorRoutes.userDimension}`] = { func: ideatorUserDimensionHandler, method: 'POST' };
handlers[`/ideator${IdeatorRoutes.summarize}`] = { func: ideatorSummarizeHandler, method: 'POST' };
handlers[`/ideator${IdeatorRoutes.image}`] = { func: ideatorImageHandler, method: 'POST' };
handlers[`/ideator${IdeatorRoutes.prose}`] = { func: ideatorProseHandler, method: 'POST' };

/*
 * Create an express router for the agent API
 *
 * @export
 * @returns {express.Router}
 * */
export function AgentRouter(): express.Router {
  const router = express.Router();

  // Get all the routes
  const routes = Object.keys(handlers);
  // Create the GET and POST routes
  for (const route of routes) {
    const handler = handlers[route];
    if (handler.method === 'GET') {
      router.get(route, async (req, res) => {
        try {
          const response = await handler.func(req.body);
          return res.json(response);
        } catch (e) {
          const error: SError = { message: (<Error>e).message };
          res.status(400).json(error);
        }
      });
    } else if (handler.method === 'POST') {
      router.post(route, async (req, res) => {
        try {
          const response = await handler.func(req.body);
          return res.json(response);
        } catch (e) {
          const error: SError = { message: (<Error>e).message };
          res.status(400).json(error);
        }
      });
    } else {
      throw new Error('AgentRouter> Unknown HTTP verb');
    }
  }

  return router;
}
