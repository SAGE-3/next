import * as Y from 'yjs';
import type {
  PluginAppRecord,
  PluginCommandRequest,
  PluginContext,
  PluginEvents,
  PluginInit,
  PluginMessage,
  PluginMethod,
  PluginOperations,
  PluginSnapshot,
} from './protocol';
import { PluginText } from './text';

const protocol = 'sage3:plugin';

type PendingRequest = {
  readonly id: string;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
};

type CommandHandler = (context: PluginContext) => void | Promise<void>;

type Listener = (data: unknown) => void | Promise<void>;

/**
 * The sole window message is the parent handshake; application traffic uses its dedicated port.
 * Only the SAGE3 host holds the other end; it always sends init, answers every request, and
 * apiVersion 1 fixes every message shape.
 */
export class SAGE3Plugin {
  public readonly ready: Promise<PluginInit>;
  private readonly pending: PendingRequest[] = [];
  private readonly commands: { readonly id: string; readonly handler: CommandHandler }[] = [];
  private readonly texts: PluginText[] = [];
  // Subscribing and unsubscribing replace an event's array, so an emit in progress iterates a stable array.
  private readonly listeners: Record<keyof PluginEvents, readonly Listener[]> = {
    context: [],
    state: [],
    app: [],
    text: [],
    error: [],
  };
  private resolveReady!: (init: PluginInit) => void;
  private rejectReady!: (error: Error) => void;
  private port?: MessagePort;
  private closed = false;
  private sequence = 0;
  private currentState: PluginSnapshot = { revision: 0, value: {} };
  private currentApp?: PluginAppRecord;
  private currentContext?: PluginContext;

  constructor() {
    // The repository targets ES2023, before Promise.withResolvers.
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    // Keep disposal before a consumer awaits ready from producing an unhandled rejection.
    void this.ready.catch(() => undefined);

    window.addEventListener('message', this.acceptInit);
    window.parent.postMessage({ protocol, kind: 'ready' }, '*');
  }

  public get state(): PluginSnapshot {
    return this.currentState;
  }

  public get app(): PluginAppRecord | undefined {
    return this.currentApp;
  }

  public get context(): PluginContext | undefined {
    return this.currentContext;
  }

  // The trusted host page forwards only the init message, with its port, from SAGE3.
  private readonly acceptInit = (event: MessageEvent<Extract<PluginMessage, { kind: 'init' }>>): void => {
    if (event.source !== window.parent) {
      return;
    }

    const init = event.data.data;
    this.currentState = init.state;
    this.currentApp = init.app;
    this.currentContext = init.context;

    this.port = event.ports[0];
    this.port.onmessage = this.receive;
    this.port.start();

    window.removeEventListener('message', this.acceptInit);
    this.resolveReady(init);
  };

  private readonly receive = (event: MessageEvent<PluginMessage>): void => {
    const message = event.data;

    if (message.kind === 'dispose') {
      this.dispose(new Error(message.error));
    } else if (message.kind === 'response') {
      const index = this.pending.findIndex((request) => request.id === message.id);

      if (index < 0) {
        return;
      }

      const pending = this.pending[index];
      this.pending.splice(index, 1);

      if (message.error !== undefined) {
        pending.reject(new Error(message.error));
      } else {
        pending.resolve(message.result);
      }
    } else if (message.kind === 'request' && message.method === 'command.run') {
      void this.runCommand(message.id, message.params);
    } else if (message.kind === 'event') {
      switch (message.event) {
        case 'context':
          this.currentContext = message.data;
          this.emit('context', message.data);
          break;
        case 'state':
          this.currentState = message.data;
          this.emit('state', message.data);
          break;
        case 'app':
          this.currentApp = message.data;
          this.emit('app', message.data);
          break;
        case 'text':
          this.emit('text', message.data);
          break;
      }
    }
  };

  public async request<M extends PluginMethod>(
    method: M,
    ...args: PluginOperations[M]['params'] extends undefined ? [params?: undefined] : [params: PluginOperations[M]['params']]
  ): Promise<PluginOperations[M]['result']> {
    await this.ready;

    const port = this.port!;

    if (this.closed) {
      throw new Error('SAGE3 plugin is disposed.');
    }

    const id = String(++this.sequence);
    const result = await new Promise<unknown>((resolve, reject) => {
      // An uncloneable payload throws here and rejects before anything is registered;
      // the response is dispatched asynchronously, after registration.
      port.postMessage({
        protocol,
        kind: 'request',
        id,
        method,
        params: args[0],
      });
      this.pending.push({ id, resolve, reject });
    });

    // The host answers each request id with that operation's result.
    return result as PluginOperations[M]['result'];
  }

  public on<E extends keyof PluginEvents>(event: E, callback: (data: PluginEvents[E]) => void | Promise<void>): () => void {
    if (this.closed) {
      throw new Error('SAGE3 plugin is disposed.');
    }

    // emit() passes each event its own payload.
    this.listeners[event] = [...this.listeners[event], callback as Listener];

    return () => {
      this.listeners[event] = this.listeners[event].filter((listener) => listener !== callback);
    };
  }

  public onCommand(id: string, handler: (context: PluginContext) => void | Promise<void>): () => void {
    if (this.closed) {
      throw new Error('SAGE3 plugin is disposed.');
    }

    if (this.commands.some((command) => command.id === id)) {
      throw new Error(`Command already registered: ${id}.`);
    }

    const command = { id, handler };
    this.commands.push(command);

    return () => {
      const index = this.commands.indexOf(command);

      if (index >= 0) {
        this.commands.splice(index, 1);
      }
    };
  }

  private async runCommand(requestId: string, params: PluginCommandRequest['params']): Promise<void> {
    let error: string | undefined;

    try {
      const handler = this.commands.find((command) => command.id === params.id)?.handler;

      if (!handler) {
        throw new Error(`No handler registered for command: ${params.id}.`);
      }

      await handler(params.context);
    } catch (failure: unknown) {
      error = failure instanceof Error ? failure.message : String(failure);
    }

    // A disposed SDK has closed its port, so this post is then a no-op.
    this.port?.postMessage({ protocol, kind: 'response', id: requestId, error });
  }

  private async textAppId(appId?: string): Promise<string> {
    const init = await this.ready;
    const targetAppId = appId ?? init.appId;
    if (!targetAppId) {
      throw new Error('Text access requires a bound app or an explicit appId.');
    }
    return targetAppId;
  }

  /** Read a named SDK plaintext document without creating an editable handle. */
  public async readText(field: string, appId?: string): Promise<string> {
    const targetAppId = await this.textAppId(appId);
    const snapshot = await this.request('text.get', { appId: targetAppId, field });
    const document = new Y.Doc();
    try {
      Y.applyUpdate(document, Uint8Array.from(atob(snapshot.update), (character) => character.charCodeAt(0)));
      return document.getText(field).toString();
    } finally {
      document.destroy();
    }
  }

  public async openText(field: string, appId?: string): Promise<PluginText> {
    const targetAppId = await this.textAppId(appId);

    const text = new PluginText(
      targetAppId,
      field,
      (update) => this.request('text.apply', { appId: targetAppId, field, update }),
      (error) => this.reportError(error, 'text'),
      () => {
        unsubscribe();

        const index = this.texts.indexOf(text);

        if (index >= 0) {
          this.texts.splice(index, 1);
        }
      },
    );

    // Register before fetching: a concurrent edit can arrive before the initial response.
    // on() throws once the plugin is disposed; disposal also disposes every open text.
    const unsubscribe = this.on('text', (snapshot) => {
      if (snapshot.appId === targetAppId && snapshot.field === field) {
        text.receive(snapshot);
      }
    });

    const ready = this.request('text.get', { appId: targetAppId, field })
      .then((snapshot) => {
        text.receive(snapshot);

        return text;
      })
      .catch((error: unknown) => {
        text.dispose();
        throw error;
      });

    this.texts.push(text);

    return ready;
  }

  private emit<E extends keyof PluginEvents>(event: E, data: PluginEvents[E]): void {
    for (const listener of this.listeners[event]) {
      try {
        void Promise.resolve(listener(data)).catch((error: unknown) => this.reportError(error, event));
      } catch (error: unknown) {
        this.reportError(error, event);
      }
    }
  }

  private reportError(error: unknown, event: keyof PluginEvents): void {
    const failure = error instanceof Error ? error : new Error(String(error));

    if (event !== 'error' && this.listeners.error.length) {
      this.emit('error', failure);
    } else {
      console.error(failure);
    }
  }

  public dispose(reason: Error = new Error('SAGE3 plugin is disposed.')): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.port?.postMessage({ protocol, kind: 'dispose', error: reason.message });

    while (this.texts.length) {
      this.texts[0].dispose();
    }

    window.removeEventListener('message', this.acceptInit);

    if (this.port) {
      this.port.onmessage = null;
      this.port.close();
    }

    // The closed port delivers nothing further, so handlers and listeners are never invoked again.
    this.rejectReady(reason);
    this.pending.forEach(({ reject }) => reject(reason));
  }
}
