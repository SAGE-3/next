/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AiModel } from '../AbstractAiModel';
import { ServerConfiguration } from '@sage3/shared/types';

// Response Types
import { AiQueryResponse } from '@sage3/shared';

export class CodeLlamaModel extends AiModel {
  private _url: string;
  private _maxTokens: number;
  private _model: string;
  public name = 'code-llama';

  constructor(config: ServerConfiguration) {
    super();
    this._url = config.services.codellama.url;
    this._maxTokens = config.services.codellama.max_tokens;
    this._model = config.services.codellama.model;
  }

  public async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this._url}/v1/health/ready`, { method: 'GET' });
      if (response.status === 200) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  public async query(input: string): Promise<AiQueryResponse> {
    return {
      success: false,
      error_message: `Not implemented: ${input} for ${this.name}`,
    };
  }

  public async code(prompt: string, input: string): Promise<AiQueryResponse> {
    try {
      const modelBody = {
        model: this._model,
        messages: [
          {
            role: 'assistant',
            content: prompt,
          },
          {
            role: 'user',
            content: input,
          },
        ],
        stream: false,
        max_tokens: this._maxTokens,
      };
      const response = await fetch(`${this._url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelBody),
      });
      if (response.status == 200) {
        const data = await response.json();
        return {
          success: true,
          output: data.choices[0].message.content,
        };
      } else {
        return {
          success: false,
          error_message: 'Failed to query code-llama',
        };
      }
    } catch (error) {
      return {
        success: false,
        error_message: `Failed to query code-llama: ${error.message}`,
      };
    }
  }
}
