/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { CodeLlamaModel, OpenAiModel } from './models';

import { config } from '../../../../config';
import { AiStatusResponse } from '@sage3/shared';

// Request Return Type
export type GenerateResponseType = {
  success: boolean;
  generated_text?: string;
};

export function AiRouter(): express.Router {
  const router = express.Router();

  // Setup Models
  const codeLlama = new CodeLlamaModel(config);
  const openai = new OpenAiModel(config);

  // Check if the Ai Code System is online
  router.get('/status', async (req, res) => {
    // Array of online models
    const onlineModels: string[] = [];
    // Check Llama
    const codeLlamaHealth = await codeLlama.health();
    if (codeLlamaHealth) {
      onlineModels.push(codeLlama.name);
    }
    // Check OpenAI
    const openAIHealth = await openai.health();
    if (openAIHealth) {
      onlineModels.push(openai.name);
    }
    // Return the response
    const responseMessage = {
      onlineModels,
    } as AiStatusResponse;
    res.status(200).json(responseMessage);
  });

  // Post a explain code request
  router.post('/query', async (req, res) => {
    // Get the request parameters
    const { input, model } = req.body;

    // Try/catch block to handle errors
    try {
      if (model === codeLlama.name) {
        // Query Llama with the input
        const response = await codeLlama.query(input);
        // Return the response
        res.status(200).json(response);
      } else if (model === openai.name) {
        // Query OpenAI with the input
        const response = await openai.query(input);
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
