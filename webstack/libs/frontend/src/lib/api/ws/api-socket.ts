import { SBDocumentMessage, SBJSON } from "@sage3/sagebase";
import { genId } from "@sage3/shared";
import { APIClientWSMessage } from "@sage3/shared/types";


export class SocketAPI {

  private static instance: SocketAPI;
  private socket: WebSocket;
  private subscriptions: Record<string, (message: any) => void>;

  private constructor() {
    this.subscriptions = {};
    const socketType = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${socketType}//${window.location.hostname}:${window.location.port}/api`);
    this.socket.addEventListener('open', (event) => {
      this.socket.addEventListener('message', this.processServerMessage);
    });
    this.socket.addEventListener('close', (event) => {
      this.socket.removeEventListener('message', this.processServerMessage);
    });

  }

  private processServerMessage(message: MessageEvent<any>) {
    const msg = JSON.parse(message.data);
    if (this.subscriptions[msg.subId]) {
      this.subscriptions[msg.subId](msg.doc);
    } else {
      console.log("WS Mesage with no Sub> ", message);
    }
  }

  private sendMessage(message: string) {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(message);
    }
  }

  public subscribe<T extends SBJSON>(route: string, body: any, callback: (message: SBDocumentMessage<T>) => void): () => void {
    const id = genId();
    const subId = genId();
    const subMessage = {
      id,
      route,
      body: {
        subId,
        ...body
      }
    } as APIClientWSMessage;
    this.subscriptions[subId] = callback;
    this.sendMessage(JSON.stringify(subMessage));
    return () => {
      const parts = subMessage.route.split('/');
      const route = `/api/${parts[2]}/unsubscribe`;
      const unsubMessage = {
        id: genId(),
        route,
        body: {
          subId
        }
      } as APIClientWSMessage;
      this.sendMessage(JSON.stringify(unsubMessage));
      delete this.subscriptions[id];
    }
  }

  public static getInstance(): SocketAPI {
    if (!SocketAPI.instance) {
      // Create the singleton
      SocketAPI.instance = new SocketAPI();
    }
    return SocketAPI.instance;
  }
}

