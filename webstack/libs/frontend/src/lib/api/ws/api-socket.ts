/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SBDocumentMessage, SBJSON } from '@sage3/sagebase';
import { genId } from '@sage3/shared';
import { APIClientWSMessage } from '@sage3/shared/types';
import { CollectionDocs } from '../index';

class SocketAPISingleton {
  private _socketType: string;
  private _socket!: WebSocket;
  private _subscriptions: Record<
    string,
    {
      callback: (message: SBDocumentMessage<any>) => void;
      unsub: (message: SBDocumentMessage<any>) => void;
    }
  >;

  private _restmessages: Record<string, any>;

  public constructor() {
    this._subscriptions = {};
    this._restmessages = {};
    this._socketType = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  }

  private processServerMessage(message: MessageEvent<any>) {
    const msg = JSON.parse(message.data);
    if (this._subscriptions[msg.id]) {
      this._subscriptions[msg.id].callback(msg.event);
    } else if (this._restmessages[msg.id]) {
      this._restmessages[msg.id](msg);
      delete this._restmessages[msg.id];
    } else {
      // this.print('Message received but has no owner:' + msg.event);
    }
  }

  private sendMessage(message: string): void {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(message);
      // } else {
      // this.printWarn('Socket still connecting...');
      // setTimeout(() => this.sendMessage(message), 1000);
    }
  }

  public async sendRESTMessage(
    route: APIClientWSMessage['route'],
    method: Exclude<APIClientWSMessage['method'], 'SUB' | 'UNSUB'>,
    body?: Record<string, unknown> | { batch: Record<string, unknown> | string[] }
  ): Promise<any> {
    await this.init();
    const message = {
      id: genId(),
      route: '/api' + route,
      method,
    } as APIClientWSMessage;
    if (body) message.body = body;
    let promiseResolve;
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
    });
    this._restmessages[message.id] = promiseResolve;
    this.sendMessage(JSON.stringify(message));
    return promise;
  }

  public async subscribe<T extends CollectionDocs>(
    route: string,
    callback: (message: SBDocumentMessage<T['data']>) => void
  ): Promise<() => void> {
    const subMessage = {
      id: genId(),
      route: '/api' + route,
      method: 'SUB',
    } as APIClientWSMessage;
    await this.init();
    const unsub = () => {
      const parts = subMessage.route.split('/');
      const route = `/api/${parts[2]}`;
      const unsubMessage = {
        id: subMessage.id,
        route,
        method: 'UNSUB',
      } as APIClientWSMessage;
      delete this._subscriptions[subMessage.id];
      this.sendMessage(JSON.stringify(unsubMessage));
      return;
    };

    this._subscriptions[subMessage.id] = {
      callback,
      unsub,
    };
    this.sendMessage(JSON.stringify(subMessage));

    return unsub;
  }

  public async init(): Promise<void> {
    return new Promise((resolve) => {
      if (this._socket !== undefined) {
        return resolve();
      }
      this.print('Initializating socket...');

      this._subscriptions = {};

      this._socket = new WebSocket(`${this._socketType}//${window.location.host}/api`);

      this._socket.addEventListener('open', (event) => {
        this.print('Connection Open');
        return resolve();
      });

      this._socket.addEventListener('message', (ev) => this.processServerMessage(ev));

      this._socket.addEventListener('close', (event) => {
        this.printWarn('Connection Closed');
        this._subscriptions = {};
        this._restmessages = {};
        this._socket.removeEventListener('message', (ev) => this.processServerMessage(ev));
      });

      this._socket.addEventListener('error', (event) => {
        this.printError('Connection Error');
        this._subscriptions = {};
        this._restmessages = {};
        this._socket.removeEventListener('message', (ev) => this.processServerMessage(ev));
      });
    });
  }

  public async getSocket(): Promise<WebSocket> {
    await this.init();
    return this._socket;
  }

  private printWarn(message: string): void {
    console.warn('SocketAPI> ', message);
  }

  private printError(message: string): void {
    console.error('SocketAPI> ', message);
  }

  private print(message: string): void {
    console.log('SocketAPI> ', message);
  }
}

export const SocketAPI = new SocketAPISingleton();
