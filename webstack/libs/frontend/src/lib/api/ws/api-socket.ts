import { SBDocumentMessage, SBJSON } from '@sage3/sagebase';
import { genId } from '@sage3/shared';
import { APIClientWSMessage } from '@sage3/shared/types';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

export class SocketAPI {
  private static instance: SocketAPI;
  private socketObserver: apiSocketObserver;
  private subscriptions: Record<string, (message: any) => void>;

  private constructor() {
    this.socketObserver = apiSocketObserver.getInstance();
    this.subscriptions = {};
    this.socketObserver.observeSocket.subscribe((message: unknown) => this.processServerMessage(message as any));
  }

  private processServerMessage(message: any) {
    if (this.subscriptions[message.subId]) {
      this.subscriptions[message.subId](message.doc);
    } else {
      console.log('WS Mesage with no Sub> ', message);
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
        ...body,
      },
    } as APIClientWSMessage;
    this.subscriptions[subId] = callback;
    this.socketObserver.send(subMessage);
    return () => {
      const parts = subMessage.route.split('/');
      const route = `/api/${parts[2]}/unsubscribe`;
      const unsubMessage = {
        id: genId(),
        route,
        body: {
          subId,
        },
      } as APIClientWSMessage;
      this.socketObserver.send(unsubMessage);
      delete this.subscriptions[id];
    };
  }

  public static getInstance(): SocketAPI {
    if (!SocketAPI.instance) {
      // Create the singleton
      SocketAPI.instance = new SocketAPI();
    }
    return SocketAPI.instance;
  }
}

class apiSocketObserver {
  // The singleton instance
  private static instance: apiSocketObserver;
  public observeSocket: WebSocketSubject<unknown>;

  private constructor() {
    console.log('wsObserve> opening socket');
    // Open a socket.
    const socketType = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // this.observeSocket = webSocket(`${socketType}//${window.location.hostname}:${window.location.port}/api`);
    this.observeSocket = webSocket('ws://localhost:3333/api');
  }

  public send(message: any): void {
    this.observeSocket.next(message);
  }

  public static getInstance(): apiSocketObserver {
    if (!apiSocketObserver.instance) {
      // Create the singleton
      apiSocketObserver.instance = new apiSocketObserver();
    }
    return apiSocketObserver.instance;
  }
}
