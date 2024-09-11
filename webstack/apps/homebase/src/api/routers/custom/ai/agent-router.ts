/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { config } from 'apps/homebase/src/config';
import ky from 'ky';

import { SError, AgentRoutes, HealthRequest, HealthResponse, AskRequest, AskResponse } from '@sage3/shared';

// Define a general RPC handler type
type RpcHandler<Request, Response> = (req: Request) => (Response | SError) | Promise<Response | SError>;

// Index the list of handlers with string keys used as route names
interface HandlerStore {
  [key: string]: { func: RpcHandler<any, any>; method: 'POST' | 'GET' };
}

// Forward functions to the agents
const statusHandler: RpcHandler<HealthRequest, HealthResponse> = (req) => {
  const route = AgentRoutes.status;
  // return ky.get(`${config.agents.url}${route}`).json();
  return fetch(`${config.agents.url}${route}`).then((res) => res.json());
};
const askHandler: RpcHandler<AskRequest, AskResponse> = (req) => {
  const route = AgentRoutes.ask;
  // return ky.post(`${config.agents.url}${route}`, { json: req }).json();
  return fetch(`${config.agents.url}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  }).then((res) => res.json());
};
const summaryHandler: RpcHandler<AskRequest, AskResponse> = (req) => {
  const route = AgentRoutes.summary;
  // return ky.post(`${config.agents.url}${route}`, { json: req }).json();
  return fetch(`${config.agents.url}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  }).then((res) => res.json());
};

// List all the handlers
const handlers: HandlerStore = {};
handlers[AgentRoutes.status] = { func: statusHandler, method: 'GET' };
handlers[AgentRoutes.ask] = { func: askHandler, method: 'POST' };
handlers[AgentRoutes.summary] = { func: summaryHandler, method: 'POST' };

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
