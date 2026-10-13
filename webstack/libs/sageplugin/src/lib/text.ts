import * as Y from 'yjs';
import { TextAreaBinding } from 'y-textarea';
import type { PluginTextSnapshot } from './protocol';

type TextFlush = {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
};

/** A single app-owned plaintext document, transported only through the plugin's scoped host port. */
export class PluginText {
  public readonly text: Y.Text;
  private readonly document = new Y.Doc();
  private readonly remoteOrigin = {};
  private readonly pending: Uint8Array[] = [];
  private listeners: readonly ((value: string) => void)[] = [];
  private bindings: readonly (() => void)[] = [];
  private timer?: number;
  private flight?: TextFlush;
  private closed = false;

  constructor(
    public readonly appId: string,
    public readonly field: string,
    private readonly sendUpdate: (update: string) => Promise<PluginTextSnapshot>,
    private readonly onError: (error: Error) => void,
    private readonly onDispose: () => void,
  ) {
    this.text = this.document.getText(field);
    this.document.on('update', this.onUpdate);
    this.text.observe(this.onTextChange);
  }

  public get value(): string {
    return this.text.toString();
  }

  /**
   * Merge both subscription events and request replies for this app and field; late replies after
   * disposal are ignored. SAGE3Plugin delivers only snapshots of this document.
   */
  public receive(snapshot: PluginTextSnapshot): void {
    if (this.closed) {
      return;
    }

    const binary = atob(snapshot.update);
    const update = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    Y.applyUpdate(this.document, update, this.remoteOrigin);
  }

  /** Observe subsequent text changes. Read value separately for the initial render. */
  public observe(listener: (value: string) => void): () => void {
    this.requireOpen();

    this.listeners = [...this.listeners, listener];

    return () => {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    };
  }

  /** Relative Yjs positions preserve the local selection when another writer inserts or deletes. */
  public bindTextarea(element: HTMLTextAreaElement): () => void {
    this.requireOpen();

    const binding = new TextAreaBinding(this.text, element);
    const unbind = () => {
      binding.destroy();
      this.bindings = this.bindings.filter((candidate) => candidate !== unbind);
    };

    this.bindings = [...this.bindings, unbind];

    return unbind;
  }

  private readonly onTextChange = (): void => {
    const value = this.value;

    for (const listener of this.listeners) {
      try {
        listener(value);
      } catch (error: unknown) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  private readonly onUpdate = (update: Uint8Array, origin: unknown): void => {
    if (this.closed || origin === this.remoteOrigin) {
      return;
    }

    this.pending.push(update);

    if (this.timer === undefined && !this.flight) {
      this.timer = window.setTimeout(() => {
        this.timer = undefined;
        // flush reports the error and retains every unacknowledged update for an explicit retry.
        void this.flush().catch(() => undefined);
      }, 150);
    }
  };

  /** Resolves only after all buffered updates are durably acknowledged. Failures retain the buffer. */
  public flush(): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error('Plugin text is disposed.'));
    }

    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.flight) {
      return this.flight.promise;
    }

    if (this.pending.length === 0) {
      return Promise.resolve();
    }

    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });

    const flight: TextFlush = { promise, resolve, reject };
    this.flight = flight;
    void this.sendPending(flight);

    return promise;
  }

  private async sendPending(flight: TextFlush): Promise<void> {
    try {
      while (!this.closed && this.pending.length > 0) {
        const count = this.pending.length;
        const update = Y.mergeUpdates(this.pending.slice(0, count));

        let binary = '';

        for (let offset = 0; offset < update.length; offset += 8192) {
          binary += String.fromCharCode(...update.subarray(offset, offset + 8192));
        }

        // After disposal, receive() ignores the reply and the loop ends.
        const snapshot = await this.sendUpdate(btoa(binary));

        this.receive(snapshot);
        this.pending.splice(0, count);
      }

      flight.resolve();
    } catch (failure: unknown) {
      if (!this.closed) {
        const error = failure instanceof Error ? failure : new Error(String(failure));
        flight.reject(error);
        this.onError(error);
      }
    } finally {
      if (this.flight === flight) {
        this.flight = undefined;
      }
    }
  }

  private requireOpen(): void {
    if (this.closed) {
      throw new Error('Plugin text is disposed.');
    }
  }

  /** Call and await flush before disposal to save edits. Disposal never claims unfinished edits were saved. */
  public dispose(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }

    const error = new Error(this.pending.length > 0 ? 'Plugin text disposed with unsaved changes.' : 'Plugin text is disposed.');
    this.flight?.reject(error);
    this.flight = undefined;

    for (const unbind of this.bindings) {
      unbind();
    }

    this.listeners = [];
    this.text.unobserve(this.onTextChange);
    this.document.off('update', this.onUpdate);
    this.document.destroy();
    this.onDispose();

    if (this.pending.length > 0) {
      this.onError(error);
    }
  }
}
