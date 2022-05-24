import { SBDocumentMessage, SBJSON } from "@sage3/sagebase";
import { APIWSEvent, APIWSMessage, APIWSRequest } from "@sage3/shared/types";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import { v4 } from "uuid";

export class SocketAPI {
  private static instance: SocketAPI;
  private socketObserver: apiSocketObserver;
  private subscriptions: Record<string, (message: any) => void>;

  private requestCallbacks: Record<string, Promise<() => void>>;


  private constructor() {
    this.socketObserver = apiSocketObserver.getInstance();
    this.subscriptions = {};
    this.requestCallbacks = {};
    this.socketObserver.observeSocket.subscribe((message: unknown) => this.processServerMessage(message as APIWSMessage | APIWSEvent<SBJSON>));
  }

  private processServerMessage(message: APIWSMessage | APIWSEvent<SBJSON>) {
    if (message.type === 'event') {
      this.subscriptions[message.msgId](message.event);
    } else {
      console.log("WS REPONSE> ", message);
    }
  }

  public sendMessage(message: APIWSRequest): void {
    const id = v4();
    const request = {
      ...message,
      msgId: id
    } as APIWSMessage;
    this.socketObserver.send(request);
  }

  public subscribe<T extends SBJSON>(message: APIWSRequest, callback: (message: SBDocumentMessage<T>) => void): () => void {
    const id = v4();
    const request = {
      ...message,
      msgId: id
    } as APIWSMessage;
    this.subscriptions[id] = callback;
    this.socketObserver.send(request);
    return () => {
      const parts = message.route.split('/');
      const route = `/api/${parts[2]}/unsubscribe`;
      const unsubRequest = {
        msgId: id,
        type: 'unsub',
        route,
        body: {
          subId: id
        }
      } as APIWSMessage;
      this.socketObserver.send(unsubRequest)
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


class apiSocketObserver {
  // The singleton instance
  private static instance: apiSocketObserver;
  public observeSocket: WebSocketSubject<unknown>;

  private constructor() {
    console.log("wsObserve> opening socket");
    // Open a socket.
    const socketType = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';

    this.observeSocket = webSocket(`${socketType}//${window.location.hostname}:${window.location.port}/api`);


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