const { NlpManager } = require('node-nlp');

// Training Data File
import { traindata } from './test';

class SAGEnlpClass {
  private _manager: any | null = null;
  constructor() {}

  public async init(): Promise<boolean> {
    console.log('SAGEnlp> nlp initialized');
    this._manager = new NlpManager({ languages: ['en'], forceNER: true });
    traindata.forEach((el: any) => {
      console.log(el);

      this._manager.addDocument('en', el.query, el.VisualizationTask);
    });
    let answers = ['extremum', 'distribution', 'cluster', 'anomoly', 'correlation', 'value', 'trend'];

    for (let i = 0; i < answers.length; i++) {
      this._manager.addAnswer('en', answers[i], answers[i]);
    }
    // This needs to be 'await'
    this._manager.train();
    this._manager.save();
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
