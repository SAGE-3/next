/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import OpenAI from 'openai';
import { AiModel } from '../AbstractAiModel';
import { ServerConfiguration } from '@sage3/shared/types';

// Response Types
import { AiQueryResponse } from '@sage3/shared';

export class OpenAiVision extends AiModel {
  private _apiKey: string = '';
  private _model: string = '';
  private _openai: OpenAI | null = null;
  private _enabled: boolean = false;
  public name = 'openai-vision';

  constructor(config: ServerConfiguration) {
    super();
    if (
      config.services.openaivision &&
      config.services.openaivision.apiKey &&
      config.services.openaivision.model === 'gpt-4-vision-preview'
    ) {
      this._apiKey = config.services.openaivision.apiKey;
      this._model = config.services.openaivision.model;
      this._openai = new OpenAI({ apiKey: this._apiKey });
      this._enabled = true;
    } else {
      this._enabled = false;
      this._openai = null;
    }
  }

  public async health(): Promise<boolean> {
    if (this._enabled) {
      return true;
    } else {
      return false;
    }
  }

  public async query(input: string): Promise<AiQueryResponse> {
    return {
      success: false,
      error_message: `Not implemented: ${input} for ${this.name}`,
    };
  }

  public async describe(input: string, prompt: string): Promise<AiQueryResponse> {
    if (!this._enabled || !this._openai) {
      return {
        success: false,
        error_message: 'OpenAI not configured',
      };
    }
    const prompt_text = `Identify all the objects, animals or persons in the image. All answers are to be written in markdown format.`;
    // Query OpenAI with the input
    const response = await this._openai.chat.completions.create({
      messages: [
        { role: 'system', content: prompt_text },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${input}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      model: this._model,
    });
    if (response.choices[0].message.content === null) {
      return {
        success: false,
        error_message: 'Failed to query OpenAI',
      };
    } else {
      return {
        success: true,
        output: response.choices[0].message.content,
      };
    }
  }

  public async imageToLabels(): Promise<AiQueryResponse> {
    return {
      success: false,
      error_message: `Failed to query OpenAiVision model`,
    };
  }

  public async imageToImage(): Promise<AiQueryResponse> {
    return {
      success: false,
      error_message: `Failed to query OpenAiVision model`,
    };
  }
}
