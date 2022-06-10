import { SBDocumentMessage, SBJSON } from "@sage3/sagebase";
import { genId } from "@sage3/shared";
import { APIClientWSMessage } from "@sage3/shared/types";


class SocketAPISingleton {

  private _socketType: string;
  private _socket!: WebSocket;
  private _subscriptions: Record<string, {
    callback: (message: SBDocumentMessage<any>) => void,
    unsub: (message: SBDocumentMessage<any>) => void
  }>;

  public constructor() {
    this._subscriptions = {};
    this._socketType = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
  }

  private processServerMessage(message: MessageEvent<any>) {
    const msg = JSON.parse(message.data);
    if (this._subscriptions[msg.subId]) {
      this._subscriptions[msg.subId].callback(msg.event);
    } else {
      this.print('Message received with no subscription.');
    }
  }

  private sendMessage(message: string): void {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      //this._socket.send(message);
    } else {
      this.printWarn('Socket still connecting...');
      setTimeout(() => this.sendMessage(message), 1000);
    }
  }

  public async subscribe<T extends SBJSON>(route: string, callback: (message: SBDocumentMessage<T>) => void): Promise<() => void> {
    const id = genId();
    const subId = genId();

    const subMessage = {
      id,
      route,
      subId
    } as APIClientWSMessage;

    const unsub = () => {
      const parts = subMessage.route.split('/');
      const route = `/api/${parts[2]}/unsubscribe`;
      const unsubMessage = {
        id: genId(),
        route,
        subId
      } as APIClientWSMessage;
      this.sendMessage(JSON.stringify(unsubMessage))
      delete this._subscriptions[id];
      return;
    }

    this._subscriptions[subId] = {
      callback,
      unsub
    }
    await this.sendMessage(JSON.stringify(subMessage));

    return unsub;
  }

  public init(): void {
    this.print('Initializating socket...');
    this._subscriptions = {};

    this._socket = new WebSocket(`${this._socketType}//${window.location.hostname}:${window.location.port}/api`);

    this._socket.addEventListener('open', (event) => {
      this.print('WS Connected');
    });

    this._socket.addEventListener('message', this.processServerMessage);

    this._socket.addEventListener('close', (event) => {
      this.printWarn('WS API Connection Closed');
      this._subscriptions = {};
      this._socket.removeEventListener('message', this.processServerMessage);
    });

    this._socket.addEventListener('error', (event) => {
      this.printError('Connection Closed');
      this._subscriptions = {};
      this._socket.removeEventListener('message', this.processServerMessage);
    });

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
