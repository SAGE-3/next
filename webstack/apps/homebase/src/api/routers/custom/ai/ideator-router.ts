/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { config } from 'apps/homebase/src/config';

import {
  SError,
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

type RpcHandlerPost<Request, Response> = (req: Request) => (Response | SError) | Promise<Response | SError>;

interface HandlerStore {
  [key: string]: { func: RpcHandlerPost<any, any>; method: 'POST' };
}

async function fetchPost(url: string, data: object) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error('IdeatorRouter> fetchPost error', err);
      return { message: 'Error' };
    });
}

const dimensionsHandler: RpcHandlerPost<IdeatorDimensionsRequest, IdeatorDimensionsResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.dimensions}`, req);

const nodeHandler: RpcHandlerPost<IdeatorNodeRequest, IdeatorNodeResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.node}`, req);

const abstractHandler: RpcHandlerPost<IdeatorAbstractRequest, IdeatorAbstractResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.abstract}`, req);

const userDimensionHandler: RpcHandlerPost<IdeatorUserDimensionRequest, IdeatorUserDimensionResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.userDimension}`, req);

const summarizeHandler: RpcHandlerPost<IdeatorSummarizeRequest, IdeatorSummarizeResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.summarize}`, req);

const imageHandler: RpcHandlerPost<IdeatorImageRequest, IdeatorImageResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.image}`, req);

const proseHandler: RpcHandlerPost<IdeatorProseRequest, IdeatorProseResponse> = (req) =>
  fetchPost(`${config.agents.url}${IdeatorRoutes.prose}`, req);

const handlers: HandlerStore = {};
handlers[IdeatorRoutes.dimensions] = { func: dimensionsHandler, method: 'POST' };
handlers[IdeatorRoutes.node] = { func: nodeHandler, method: 'POST' };
handlers[IdeatorRoutes.abstract] = { func: abstractHandler, method: 'POST' };
handlers[IdeatorRoutes.userDimension] = { func: userDimensionHandler, method: 'POST' };
handlers[IdeatorRoutes.summarize] = { func: summarizeHandler, method: 'POST' };
handlers[IdeatorRoutes.image] = { func: imageHandler, method: 'POST' };
handlers[IdeatorRoutes.prose] = { func: proseHandler, method: 'POST' };

export function IdeatorRouter(): express.Router {
  const router = express.Router();

  for (const route of Object.keys(handlers)) {
    const handler = handlers[route];
    router.post(route, async (req, res) => {
      try {
        const response = await handler.func(req.body);
        return res.json(response);
      } catch (e) {
        const error: SError = { message: (<Error>e).message };
        res.status(400).json(error);
      }
    });
  }

  return router;
}
