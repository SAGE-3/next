/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import * as express from 'express';
import { v4 as getUUID } from 'uuid';
import { decode as decode8 } from 'utf8';

import { config } from '../../../../config';
import { AiStatusResponse, getFileType } from '@sage3/shared';
import { SBAuthSchema } from '@sage3/sagebase';
import { AssetsCollection } from '../../../collections';
import { CodeLlamaModel, OpenAiModel, YoloModel, ChatModel } from './models';

// Request Return Type
export type GenerateResponseType = {
  success: boolean;
  generated_text?: string;
};
export type JSONResponseType = {
  success: boolean;
  data?: any;
};

export function AiRouter(): express.Router {
  const router = express.Router();

  // Setup Models
  const codeLlama = new CodeLlamaModel(config);
  const openai = new OpenAiModel(config);
  const yolo = new YoloModel(config);
  const chat = new ChatModel(config);

  // Check if the chat models are online
  router.get('/chat_status', async (req, res) => {
    // Array of online models
    const onlineModels = [];
    // Check Chat
    const chatHealth = await chat.health();
    if (chatHealth) {
      onlineModels.push(chat.info());
    }
    // Return the response
    const responseMessage = { onlineModels } as AiStatusResponse;
    res.status(200).json(responseMessage);
  });

  // Post a chat request
  router.post('/chat_query', async ({ body, user }, res) => {
    // Get the request parameters
    const { input, model, max_new_tokens, app_id } = body;
    // Try/catch block to handle errors
    try {
      if (model === chat.name) {
        // Query Llama with the input
        const response = await chat.asking(input, max_new_tokens, app_id, user.id);
        // Return the response
        res.status(200).json(response);
      } else {
        // Return an error message if the request fails
        const responseMessage = { success: false } as GenerateResponseType;
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = { success: false } as GenerateResponseType;
      res.status(500).json(responseMessage);
    }
  });

  router.post('/chat', async ({ body }, res) => {
    // Get the request parameters
    const { input, model, max_new_tokens } = body;
    // Try/catch block to handle errors
    try {
      if (model === chat.name) {
        // Query Llama with the input
        const response = await chat.ask(input, max_new_tokens);
        // Return the response
        res.status(200).json(response);
      } else {
        // Return an error message if the request fails
        const responseMessage = { success: false } as GenerateResponseType;
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = { success: false } as GenerateResponseType;
      res.status(500).json(responseMessage);
    }
  });

  // Check if the code models are online
  router.get('/code_status', async (req, res) => {
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
    const responseMessage = { onlineModels } as AiStatusResponse;
    res.status(200).json(responseMessage);
  });

  // Check image models are online
  router.get('/image_status', async (req, res) => {
    // Array of online models
    const onlineModels: string[] = [];
    // Check Yolo
    const yoloHealth = await yolo.health();
    if (yoloHealth) {
      onlineModels.push(yolo.name);
    }
    // Return the response
    const responseMessage = { onlineModels } as AiStatusResponse;
    res.status(200).json(responseMessage);
  });

  // Post a explain code request
  router.post('/code_query', async (req, res) => {
    // Get the request parameters
    const { input, prompt, model } = req.body;

    // Try/catch block to handle errors
    try {
      if (model === codeLlama.name) {
        // Query Llama with the input
        const response = await codeLlama.code(prompt, input);
        // Return the response
        res.status(200).json(response);
      } else if (model === openai.name) {
        // Query OpenAI with the input
        const response = await openai.code(prompt, input);
        // Return the response
        res.status(200).json(response);
      } else {
        // Return an error message if the request fails
        const responseMessage = { success: false } as GenerateResponseType;
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = { success: false } as GenerateResponseType;
      res.status(500).json(responseMessage);
    }
  });

  // Post a explain image request
  router.post('/image_to_labels', async (req, res) => {
    // Get the request parameters
    const { assetid, model } = req.body;

    // Try/catch block to handle errors
    try {
      if (model === yolo.name) {
        // Get the file from the assetid
        const file = await AssetsCollection.get(assetid);
        if (!file) {
          // Return an error message if the request fails
          const responseMessage = { success: false } as GenerateResponseType;
          res.status(500).json(responseMessage);
          return;
        }
        // Create a form to upload the file
        const fd = new FormData();
        const fileStream = fs.createReadStream(file.data.path);
        fd.append('file', fileStream, 'image.jpg');
        // Query Yolo with the input
        const response = await yolo.imageToLabels(fd);
        if (response.success) {
          // Return the response
          const responseMessage = { success: true, data: response.output } as JSONResponseType;
          res.status(200).json(responseMessage);
        } else {
          // Return the response
          const responseMessage = { success: false } as JSONResponseType;
          res.status(500).json(responseMessage);
        }
      } else {
        // Return an error message if the request fails
        const responseMessage = { success: false } as GenerateResponseType;
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = { success: false } as GenerateResponseType;
      res.status(500).json(responseMessage);
    }
  });

  // Post an image request
  router.post('/image_to_image', async (req, res) => {
    // Get the request parameters
    const { assetid, model, filename, roomid } = req.body;

    // Get the current uploader information
    const user = req.user as SBAuthSchema;

    // Try/catch block to handle errors
    try {
      if (model === yolo.name) {
        // Get the file from the assetid
        const file = await AssetsCollection.get(assetid);
        if (!file) {
          // Return an error message if the request fails
          const responseMessage = { success: false } as GenerateResponseType;
          res.status(500).json(responseMessage);
          return;
        }
        // Create a form to upload the file
        const fd = new FormData();
        const fileStream = fs.createReadStream(file.data.path);
        fd.append('file', fileStream, filename);

        // Query Yolo with the input
        const response = await yolo.imageToImage(fd);
        if (response.success && response.output) {
          const now = new Date().toISOString();
          const originalname = decode8(filename);
          const ext = path.extname(originalname);
          const base = path.basename(originalname, ext);
          const derivedname = base + '-labels' + ext;
          const filedata = response.output;
          const folder = config.public;
          const osfilename = getUUID() + ext;
          const fullpath = path.join(folder, osfilename);
          const image = response.output;
          // Save the image to the file system
          fs.writeFileSync(fullpath, image, 'binary');
          const elt = {
            originalname: derivedname,
            mimetype: getFileType(originalname) || 'image/jpeg',
            filename: osfilename,
            path: fullpath,
            destination: folder,
            size: filedata.length,
            id: '',
          };
          // Pass the file to the metadata and process functions
          const mdata = await AssetsCollection.metadataFile(getUUID(), elt.filename, elt.mimetype).catch((e) => {
            console.log('AssetsCollection> Error metadataFile', e);
            return;
          });
          // Process image and pdf
          const pdata = await AssetsCollection.processFile(getUUID(), elt.filename, elt.mimetype).catch((e) => {
            console.log('AssetsCollection> Error processFile', e);
            return;
          });
          if (mdata) {
            // Add the new file to the collection
            const newAsset = await AssetsCollection.add(
              {
                file: elt.filename,
                owner: user.id || '-',
                room: roomid || '-',
                originalfilename: elt.originalname,
                path: elt.path,
                destination: elt.destination,
                size: elt.size,
                mimetype: elt.mimetype,
                dateAdded: now,
                derived: pdata || {},
                ...mdata,
              },
              user.id
            );
            if (newAsset) {
              // save the id of the asset in the file object, sent back to the client
              elt.id = newAsset._id;
            }
          }

          // Return the response
          const responseMessage = { success: true, data: elt } as JSONResponseType;
          res.status(200).json(responseMessage);
          return;
        } else {
          // Return an error message if the request fails
          const responseMessage = { success: false } as GenerateResponseType;
          res.status(500).json(responseMessage);
          return;
        }
      } else {
        // Return an error message if the request fails
        const responseMessage = { success: false } as GenerateResponseType;
        res.status(500).json(responseMessage);
      }
    } catch (error) {
      // Return an error message if the request fails
      const responseMessage = { success: false } as GenerateResponseType;
      res.status(500).json(responseMessage);
    }
  });

  return router;
}
