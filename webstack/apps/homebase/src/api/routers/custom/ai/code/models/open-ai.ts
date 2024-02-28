/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { GenerateResponseType } from '../aicoderouter';

import OpenAI from 'openai';
import { CodeModel } from './AbstractCodeModel';
import { ServerConfiguration } from '@sage3/shared/types';

export class CodeOpenAi extends CodeModel {
  private _apiKey: string;
  private _model: string;
  private _openai: OpenAI;

  constructor(config: ServerConfiguration) {
    super();
    this._apiKey = config.services.openai.apiKey;
    this._model = config.services.openai.model;
    this._openai = new OpenAI({ apiKey: config.services.openai.apiKey });
  }

  public async health(): Promise<boolean> {
    // We dont want to ping OpenAI constantly
    // Just check for the API Key
    if (this._openai.apiKey !== '') {
      return true;
    } else {
      return false;
    }
  }

  public async query(input: string): Promise<GenerateResponseType> {
    // Query OpenAI with the input
    const response = await this._openai.chat.completions.create({
      messages: [{ role: 'user', content: input }],
      model: this._model,
    });
    if (response.choices[0].message.content === null) {
      return {
        success: false,
      };
    } else {
      return {
        success: true,
        generated_text: response.choices[0].message.content,
      };
    }
  }
}
