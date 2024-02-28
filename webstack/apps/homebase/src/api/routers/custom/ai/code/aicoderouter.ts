/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { CodeLlama, CodeOpenAi } from './models';

import { config } from 'apps/homebase/src/config';

// Request Return Type
export type GenerateResponseType = {
  success: boolean;
  generated_text?: string;
};

type ModelNames = 'code-llama' | 'openai';

type StatusResponseType = {
  onlineModels: ModelNames[];
};

export function AiCodeRouter(): express.Router {
  const router = express.Router();

  // Setup Models
  const llama = new CodeLlama(config);
  const openai = new CodeOpenAi(config);

  // Check if the Ai Code System is online
  router.get('/status', async (req, res) => {
    // Array of online models
    const onlineModels: ModelNames[] = [];
    // Check Llama
    const llamaHealth = await llama.health();
    if (llamaHealth) {
      onlineModels.push('code-llama');
    }
    // Check OpenAI
    const openAIHealth = await openai.health();
    if (openAIHealth) {
      onlineModels.push('openai');
    }
    // Return the response
    const responseMessage = {
      onlineModels,
    } as StatusResponseType;
    res.status(200).json(responseMessage);
  });

  // Post a explain code request
  router.post('/query', async (req, res) => {
    // Get the request parameters
    const { ai_query, model } = req.body;

    // Try/catch block to handle errors
    try {
      if (model === 'code-llama') {
        // Query Llama with the input
        const response = await llama.query(ai_query);
        // Return the response
        res.status(200).json(response);
      } else if (model === 'openai') {
        // Query OpenAI with the input
        const response = await openai.query(ai_query);
        // Return the response
        res.status(200).json(response);
      } else {
        // Return an error message if the request fails
        const responseMessage = {
          success: false,
        } as GenerateResponseType;
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = {
        success: false,
      } as GenerateResponseType;
      res.status(500).json(responseMessage);
    }
  });

  return router;
}
