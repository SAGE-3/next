/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { EventSource } from 'extended-eventsource';

import { AiModel } from '../AbstractAiModel';
import { ServerConfiguration } from '@sage3/shared/types';
// Response Types
import { AiQueryResponse } from '@sage3/shared';
import { AppsCollection } from '../../../../../collections';

export class ChatModel extends AiModel {
  private _url: string;
  private _apiKey: string;
  private _model: string;
  private _maxTokens: number;
  public name = 'chat';

  constructor(config: ServerConfiguration) {
    super();
    this._url = config.services.chat.url;
    this._apiKey = config.services.chat.apiKey;
    this._model = config.services.chat.model;
    this._maxTokens = config.services.chat.max_tokens;
  }

  public info() {
    return { name: this.name, model: this._model, maxTokens: this._maxTokens };
  }

  public async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this._url}/health`, { method: 'GET' });
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

  public async ask(input: string, max_new_tokens: number): Promise<AiQueryResponse> {
    try {
      const newTokens = max_new_tokens ? max_new_tokens : this._maxTokens;
      const modelBody = {
        inputs: input,
        parameters: {
          max_new_tokens: newTokens < this._maxTokens ? newTokens : this._maxTokens,
        },
      };
      const response = await fetch(`${this._url}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelBody),
      });
      if (response.status == 200) {
        const data = await response.json();
        return {
          success: true,
          output: data.generated_text,
        };
      } else {
        return {
          success: false,
          error_message: 'Failed to query chat model.',
        };
      }
    } catch (error) {
      return {
        success: false,
        error_message: `Failed to query chat model: ${error.message}`,
      };
    }
  }

  public async asking(input: string, max_new_tokens: number, app_id: string, userId: string): Promise<AiQueryResponse> {
    return new Promise((resolve, reject) => {
      try {
        const newTokens = max_new_tokens ? max_new_tokens : this._maxTokens;
        let progress = '';
        let new_characters = 0;
        const modelBody = {
          inputs: input,
          parameters: {
            max_new_tokens: newTokens < this._maxTokens ? newTokens : this._maxTokens,
            temperature: 0.3,
          },
        };

        // Create an EventSource to stream the response
        const eventSource = new EventSource(`${this._url}/generate_stream`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(modelBody),
        });

        // EventSource event handlers
        eventSource.onopen = () => {
          // console.log('EventSource> Connection opened');
        };

        // Message event handler
        eventSource.onmessage = async (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.generated_text) {
            // That's the end of the response
            eventSource.close();
            resolve({
              success: true,
              output: message.generated_text,
            });
          } else {
            // otherwise we are getting tokens
            progress += message.token.text;
            new_characters += message.token.text.length;
            if (new_characters > 30 && app_id) {
              new_characters = 0;
              // @ts-ignore
              AppsCollection.update(app_id, userId, { 'state.token': progress });
            }
          }
        };

        // Error event handler
        eventSource.onerror = (error) => {
          console.error('EventSource> Error occurred:', error);
        };
      } catch (error) {
        reject({
          success: false,
          error_message: `Failed to query chat model: ${error.message}`,
        });
      }
    });
  }
}
