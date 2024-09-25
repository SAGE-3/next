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

export class LlamaModel extends AiModel {
  private _url: string;
  private _apiKey: string;
  private _model: string;
  private _maxTokens: number;
  public name = 'llama';

  constructor(config: ServerConfiguration) {
    super();
    this._url = config.services.llama.url;
    this._apiKey = config.services.llama.apiKey;
    this._model = config.services.llama.model;
    this._maxTokens = config.services.llama.max_tokens;
  }

  public info() {
    return { name: this.name, model: this._model, maxTokens: this._maxTokens };
  }

  public async health(): Promise<boolean> {
    try {
      let url: string;
      if (this._model === 'llama3') {
        // TGI huggingface style API
        url = `${this._url}/health`;
      } else {
        // OpenAI syle API
        url = `${this._url}/v1/health/ready`;
      }
      const response = await fetch(url, { method: 'GET' });
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
      let modelBody, url;
      if (this._model === 'llama3') {
        url = `${this._url}/generate`;
        modelBody = {
          inputs: input,
          parameters: {
            // maximum number of tokens to generate
            max_new_tokens: newTokens < this._maxTokens ? newTokens : this._maxTokens,
            // stop tokens for llama3/3.1
            stop: this._model === 'llama3' ? ['<|start_header_id|>', '<|end_header_id|>', '<|eot_id|>', '<|reserved_special_token'] : [],
          },
        };
      } else {
        url = `${this._url}/v1/chat/completions`;
        modelBody = {
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            {
              role: 'assistant',
              content:
                'You are a helpful assistant, providing informative, conscise and friendly answers to the user in Markdown format. You only return the content relevant to the question.',
            },
            { role: 'user', content: input },
          ],
          stream: false,
          // maximum number of tokens to generate
          max_tokens: newTokens < this._maxTokens ? newTokens : this._maxTokens,
        };
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelBody),
      });
      if (response.status == 200) {
        const data = await response.json();
        if (this._model === 'llama3') {
          return {
            success: true,
            output: data.generated_text,
          };
        } else {
          return {
            success: true,
            output: data.choices[0].message.content,
          };
        }
      } else {
        console.log('Failed to query llama model.');
        return {
          success: false,
          error_message: 'Failed to query llama model.',
        };
      }
    } catch (error) {
      return {
        success: false,
        error_message: `Failed to query llama model: ${error.message}`,
      };
    }
  }

  public async asking(input: string, max_new_tokens: number, app_id: string, userId: string): Promise<AiQueryResponse> {
    return new Promise((resolve, reject) => {
      try {
        let progress = '';
        let new_characters = 0;
        const newTokens = max_new_tokens ? max_new_tokens : this._maxTokens;
        let modelBody, url;
        if (this._model === 'llama3') {
          url = `${this._url}/generate_stream`;
          modelBody = {
            inputs: input,
            parameters: {
              // maximum number of tokens to generate
              max_new_tokens: newTokens < this._maxTokens ? newTokens : this._maxTokens,
              // stop tokens for llama3/3.1
              stop: this._model === 'llama3' ? ['<|start_header_id|>', '<|end_header_id|>', '<|eot_id|>', '<|reserved_special_token'] : [],
            },
          };
        } else {
          url = `${this._url}/v1/chat/completions`;
          modelBody = {
            model: 'meta/llama-3.1-8b-instruct',
            messages: [
              {
                role: 'assistant',
                content:
                  'You are a helpful assistant, providing informative, conscise and friendly answers to the user in Markdown format. You only return the content relevant to the question.',
              },
              { role: 'user', content: input },
            ],
            stream: true,
            // maximum number of tokens to generate
            max_tokens: newTokens < this._maxTokens ? newTokens : this._maxTokens,
            stream_options: {
              include_usage: true,
            },
          };
        }

        // Create an EventSource to stream the response
        const eventSource = new EventSource(url, {
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
          // OpenAI style API response
          if (event.data === '[DONE]') {
            eventSource.close();
            return resolve({
              success: true,
              output: progress,
            });
          }
          const message = JSON.parse(event.data);
          if (this._model === 'llama3') {
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
                AppsCollection.update(app_id, userId, { state: { token: progress } });
              }
            }
          } else {
            if (message.choices[0] && message.choices[0].finish_reason !== 'stop') {
              const newpart = message.choices[0].delta.content;
              if (newpart) {
                progress += newpart;
                new_characters += newpart.length;
                if (new_characters > 30 && app_id) {
                  new_characters = 0;
                  AppsCollection.update(app_id, userId, { state: { token: progress } });
                }
              }
            }
          }
        };

        // Error event handler
        eventSource.onerror = (error) => {
          console.error('EventSource> Error occurred:', error);
        };
      } catch (error) {
        console.log('Failed to query llama model.', error);
        reject({
          success: false,
          error_message: `Failed to query llama model: ${error.message}`,
        });
      }
    });
  }
}
