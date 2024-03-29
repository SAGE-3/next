/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const { NlpManager } = require('node-nlp');

// Training Data File
import { modifiedData } from './modifiedData';

class SAGEnlpClass {
  private _manager: any | null = null;
  constructor() {}

  public async init(): Promise<boolean> {
    this._manager = new NlpManager({ languages: ['en'], forceNER: true, nlu: { log: false } });
    modifiedData.forEach((el: any) => {
      this._manager.addDocument('en', el.utterance, el.primary);
    });
    const answers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    for (let i = 0; i < answers.length; i++) {
      this._manager.addAnswer('en', answers[i], answers[i]);
    }
    // This needs to be 'await'
    this._manager.train();
    this._manager.save();
    console.log('SAGEnlp> nlp initialized');
    return true;
  }

  public async classifiedMessage(message: string): Promise<string | null> {
    // TO DO Processing
    if (this._manager === null) {
      return null;
    } else {
      const response = await this._manager.process('en', message);
      if (response.intent) {
        return response.intent;
      } else {
        return null;
      }
    }
  }
}

export const SAGEnlp = new SAGEnlpClass();
