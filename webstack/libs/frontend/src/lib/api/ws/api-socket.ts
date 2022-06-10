import { SBDocumentMessage, SBJSON } from "@sage3/sagebase";
import { genId } from "@sage3/shared";
import { APIClientWSMessage } from "@sage3/shared/types";


export class SocketAPI {
  private static instance: SocketAPI;
  private socket: WebSocket;
  private subscriptions: Record<string, (message: SBDocumentMessage<any>) => void>;

  private constructor() {
    this.subscriptions = {};
    const socketType = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${socketType}//${window.location.hostname}:${window.location.port}/api`);
    this.socket.addEventListener('open', (event) => {
      console.log('WS Connected');
      this.socket.addEventListener('message', (message: MessageEvent<any>) => this.processServerMessage(message));
    });
    this.socket.addEventListener('close', (event) => {
      this.subscriptions = {};
      this.socket.removeEventListener('message', (message: MessageEvent<any>) => this.processServerMessage(message));
    });

  }

  private processServerMessage(message: MessageEvent<any>) {
    const msg = JSON.parse(message.data);
    if (this.subscriptions[msg.subId]) {
      this.subscriptions[msg.subId](msg.event);
    } else {
      console.log('WS Messsage with no Sub> ', message);
    }
  }

  private sendMessage(message: string): Promise<void> {
    return new Promise(resolve => {
      if (this.socket.readyState === this.socket.OPEN) {
        this.socket.send(message);
        resolve();
      } else {
        console.log('Socket net ready, message not sent, retrying... ');
        setTimeout(() => resolve(this.sendMessage(message)), 1000);
      }
    })
  }

  public async subscribe<T extends SBJSON>(route: string, callback: (message: SBDocumentMessage<T>) => void): Promise<() => Promise<void>> {
    const id = genId();
    const subId = genId();
    const subMessage = {
      id,
      route,
      subId
    } as APIClientWSMessage;
    this.subscriptions[subId] = callback;
    this.sendMessage(JSON.stringify(subMessage));

    return () =>
      new Promise((resolve) => {
        const parts = subMessage.route.split('/');
        const route = `/api/${parts[2]}/unsubscribe`;
        const unsubMessage = {
          id: genId(),
          route,
          subId
        } as APIClientWSMessage;
        this.sendMessage(JSON.stringify(unsubMessage))
        delete this.subscriptions[id];
        return resolve()

      });
  }

  public static getInstance(): SocketAPI {
    if (!SocketAPI.instance) {
      // Create the singleton
      SocketAPI.instance = new SocketAPI();
    }
    return SocketAPI.instance;
  }
}

