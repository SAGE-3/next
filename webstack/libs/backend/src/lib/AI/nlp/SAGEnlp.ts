const { NlpManager } = require('node-nlp');

import { spawn } from 'child_process';
import { response } from 'express';
// Training Data File
import { traindata } from './traindata';

class SAGEnlpClass {
  private _manager: any | null = null;
  constructor() {}

  public async init(): Promise<boolean> {
    this._manager = new NlpManager({ languages: ['en'], forceNER: true, nlu: { log: false } });
    traindata.forEach((el: any) => {
      this._manager.addDocument('en', el.query, el.VisualizationTask);
    });
    let answers = ['extremum', 'distribution', 'cluster', 'anomoly', 'correlation', 'value', 'trend'];

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

  public async extractHeaders(
    query: string,
    propertyList: { header: string; filterValues: string[]; headerType: string }[]
  ): Promise<{ headers: string[]; filterValues: string[] } | null> {
    // TO DO Processing
    if (this._manager === null) {
      return null;
    } else {
      let dataToSend: any;
      let pathToPythonScript = '/Users/rodericktabalba/Documents/GitHub/next/webstack/libs/backend/src/lib/AI/nlp/python/extract.py';

      const python = spawn('python', [pathToPythonScript, query, JSON.stringify(propertyList)]);
      python.stdout.on('data', (data) => {
        dataToSend = data.toString();
        console.log(dataToSend);
      });

      python.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      // python.on('exit', (code) => {
      //   console.log(`child process exited with code ${code}, ${dataToSend}`);
      //   response.sendFile(`${__dirname}/public/result.html`);
      // });
      return { headers: ['diabetes'], filterValues: ['midwest'] };
    }
  }
}

export const SAGEnlp = new SAGEnlpClass();
