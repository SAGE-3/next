/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import axios from 'axios';

const URL = 'https://astrolab.evl.uic.edu:4343';
const MAX_NEW_TOKENS = 400;

// Status Request Return Type
type StatusResponseType = {
  online: boolean;
  message: string;
};

// Request Return Type
type GenerateResponseType = {
  success: boolean;
  error_message?: string;
  data?: {
    generated_text: string;
  };
};

export function AiCodeRouter(): express.Router {
  const router = express.Router();

  // Check if the Ai Code System is online
  router.get('/status', async (req, res) => {
    try {
      // Fetch the status of the AI Code System
      // Change this fetch to axios
      const response = await axios.get(`${URL}/info`);
      // Was the response successful?
      if (response.status === 200) {
        const responseMessage = {
          online: true,
          message: 'The AI Code System is online',
        } as StatusResponseType;

        // Send the response
        res.status(200).json(responseMessage);
      } else {
        const responseMessage = {
          online: false,
          message: 'The AI Code System is offline',
        } as StatusResponseType;
        // Send the error message
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      const responseMessage = {
        online: false,
        message: error.message,
      } as StatusResponseType;
      // Send the error message
      res.status(500).json(responseMessage);
    }
  });

  // Post a explain code request
  router.post('/generate', async (req, res) => {
    // Get the request parameters
    const { ai_query } = req.body;
    // Send the request
    const modelHeaders: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const modelBody = {
      inputs: ai_query,
      parameters: {
        max_new_tokens: MAX_NEW_TOKENS,
      },
    };
    console.log(req.body);
    // Try/catch block to handle errors
    try {
      const response = await axios.post(`${URL}/generate`, modelBody);
      // Check if the response is valid
      if (response.status === 200) {
        const responseMessage = {
          success: true,
          data: response.data,
        } as GenerateResponseType;
        res.json(responseMessage);
      } else {
        // Return an error message if the request fails
        const responseMessage = {
          success: false,
          error_message: `Sorry, I couldn't process the request. Please try again.`,
        } as GenerateResponseType;
        res.json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = {
        success: false,
        error_message: error.message,
      } as GenerateResponseType;
      res.json(responseMessage);
    }
  });

  return router;
}
