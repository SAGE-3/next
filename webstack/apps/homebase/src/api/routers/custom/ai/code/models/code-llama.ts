/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import axios from 'axios';
import { GenerateResponseType } from '../aicoderouter';
import { CodeModel } from './AbstractCodeModel';
import { ServerConfiguration } from '@sage3/shared/types';

export class CodeLlama extends CodeModel {
  private _url: string;
  private _maxTokens: number;

  constructor(config: ServerConfiguration) {
    super();
    this._url = config.services.codellama.url;
    this._maxTokens = config.services.codellama.max_tokens;
  }

  public async health(): Promise<boolean> {
    try {
      const response = await axios.get(`${this._url}/health`);
      if (response.status === 200) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  public async query(input: string): Promise<GenerateResponseType> {
    try {
      const modelBody = {
        inputs: input,
        parameters: {
          max_new_tokens: this._maxTokens,
        },
      };
      const response = await axios.post(`${this._url}/generate`, modelBody);
      if (response.status == 200) {
        return {
          success: true,
          generated_text: response.data.generated_text,
        };
      } else {
        return {
          success: false,
        };
      }
    } catch (error) {
      return {
        success: false,
      };
    }
  }
}
