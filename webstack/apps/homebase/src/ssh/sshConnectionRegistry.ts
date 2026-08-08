/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * The only place anywhere that calls SBCredentialsDB.getDecryptedValue()
 * for an sshPrivateKey credential. Holds at most one live SSH connection
 * per app instance (keyed by appId) — this is a SHARED, collaborative
 * terminal, not one connection per browser tab.
 *
 * This registry takes `ownerId` as an explicit parameter on every `connect()`
 * call and trusts the caller to supply the right one — it has no notion of a
 * "stored" or persistent owner of its own, and does not enforce anything
 * about where that value came from. The guarantee that a (re)connect always
 * uses the app's persisted owner — never the identity of whichever browser
 * session happens to trigger the reconnect — is enforced by the CALLER
 * (the WebSocket relay, which reads `ownerId` from the app's Redis-backed
 * state document rather than from the triggering request's session).
 *
 * On an unexpected drop (not a deliberate disconnect() call), this registry
 * automatically retries the connection a few times with backoff before
 * giving up, broadcasting a `status` update at each step — this is the
 * "reconnect using the same stored owner/credential" behavior the design
 * spec describes, distinct from the relay's own lazy "next viewer triggers
 * a fresh connect" behavior (which only matters once no connection is
 * registered at all, i.e. after these retries are exhausted).
 */

import { Client } from 'ssh2';
import { SBCredentialsDB } from '@sage3/sagebase';
import { ConnectParams, ConnectResult, isValidSessionName } from '@sage3/backend';

export type ConnectionStatus = { connected: boolean; error?: string };

const RECONNECT_MAX_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1000;

type ResolvedCredential = { username: string; privateKey: string; passphrase?: string };

type SSHConnection = {
  client: Client;
  stream: NodeJS.ReadWriteStream & {
    setWindow: (rows: number, cols: number, height?: number, width?: number) => void;
    stderr?: NodeJS.ReadableStream;
  };
  outputListeners: Set<(data: string) => void>;
  statusListeners: Set<(status: ConnectionStatus) => void>;
  // Output arriving after connect() resolves but before the relay subscribes
  // (via onOutput) is buffered here and flushed to that first subscriber. The
  // tmux (re)attach paint is emitted in exactly that gap, so without this a
  // reconnecting viewer — which gets no capture-pane snapshot (it's the first
  // viewer) — would lose the reattached screen and see only later redraws.
  // Buffering stops for good once the first listener attaches (hasHadListener).
  initialOutput: string[];
  hasHadListener: boolean;
  // Kept so an unexpected drop can be retried without re-decrypting or
  // re-fetching the credential — this key is already resident in process
  // memory for as long as the connection itself is open, so holding onto
  // it here for the retry window doesn't change the security posture.
  credential: ResolvedCredential;
  host: string;
  port: number;
  // Set when this connection is attached to a pre-existing external tmux
  // session (as opposed to the app's own sage3-<appId> session). Undefined
  // for own sessions.
  sessionName?: string;
  // Whether an external attach is read-write. Own sessions are always
  // read-write via a different path (no `-r` flag is ever applied to them),
  // so this only has meaning alongside `sessionName`. Promoted/demoted via
  // setWritable(); reset to false on every automatic reconnect.
  writable: boolean;
  // True while a deliberate re-attach (setWritable) is in flight on this
  // connection, so the old stream's 'close' handler can tell that apart
  // from an unexpected drop and skip the retry loop.
  reattaching: boolean;
  // Input received while `reattaching` is true (a take-control re-attach in
  // flight). During that window connection.stream is still the OLD read-only
  // stream, which tmux silently drops writes on — so write() parks keystrokes
  // here and setWritable() flushes them onto the new read-write stream once the
  // swap completes, instead of losing everything typed right after take-control.
  pendingWrites: string[];
  // Set by disconnect() before ending the client, so the stream's own
  // 'close' handler can tell a deliberate disconnect from an unexpected
  // drop and skip the retry loop for the former.
  deliberatelyClosed: boolean;
  // The last cols/rows requested by resize(). Recorded on every resize even
  // when it can't be applied yet (a read-only external attach), so that a
  // subsequent take-control re-attach can adopt the size the controller
  // already asked for.
  geometry?: { cols: number; rows: number };
  // Whether we've already pinned tmux's window-size to `manual` for this
  // session (Option A). Done once, lazily, on the first resize.
  sizePinned: boolean;
};

function tmuxSessionName(appId: string): string {
  return `sage3-${appId}`;
}

// Builds the single remote tmux command. Own sessions attach-or-create the
// per-app session (read-write; input is relay-gated). External sessions
// attach-only: read-only unless `writable`.
// `sessionName` MUST already be validated (isValidSessionName) by the caller.
export function tmuxCommand(appId: string, sessionName: string | undefined, writable: boolean): string {
  if (!sessionName) return `tmux new -A -s ${tmuxSessionName(appId)}`;
  // External attaches never use `ignore-size`, so the shared board window drives
  // the real remote session's size for every viewer (size follows the window,
  // even in read-only). `-r` still gates INPUT for a non-controlling viewer; the
  // relay is the primary input gate, this is belt-and-suspenders at the tmux layer.
  if (writable) return `tmux attach -t ${sessionName}`;
  return `tmux attach -r -t ${sessionName}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptResult =
  | { success: true; client: Client; stream: SSHConnection['stream'] }
  | { success: false; error: 'auth_failed' | 'unreachable' | 'tmux_failed' | 'session_not_found' };

// Constructs the ssh2.Client and wires its 'ready'/'error'/exec handlers
// synchronously, WITHOUT calling client.connect() yet. Split out from
// attemptSSHConnection() below so the initial connect flow (doConnect) can
// create the client and register its listeners synchronously, before
// awaiting the (possibly async, e.g. Redis-backed) credential lookup — the
// same ordering the original implementation used, and one this module's
// tests rely on (they emit 'ready'/'error' on the client synchronously
// right after calling connect(), so the client and its listeners must
// already exist by then).
function createPendingAttempt(
  appId: string,
  sessionName?: string,
  writable = false
): { client: Client; promise: Promise<AttemptResult> } {
  const client = new Client();
  let hasResolved = false;
  let resolveAttempt!: (result: AttemptResult) => void;
  const promise = new Promise<AttemptResult>((resolve) => {
    resolveAttempt = resolve;
  });
  const tryResolve = (result: AttemptResult) => {
    if (!hasResolved) {
      hasResolved = true;
      resolveAttempt(result);
    }
  };

  const startTmux = () => {
    client.exec(tmuxCommand(appId, sessionName, writable), { pty: { term: 'xterm-256color' } }, (execErr, stream) => {
      if (execErr || !stream) {
        client.end();
        tryResolve({ success: false, error: 'tmux_failed' });
        return;
      }
      tryResolve({ success: true, client, stream: stream as unknown as SSHConnection['stream'] });
    });
  };

  client.on('ready', () => {
    if (!sessionName) {
      // Own session: attach-or-create, unchanged from before this task.
      startTmux();
      return;
    }
    if (!isValidSessionName(sessionName)) {
      client.end();
      tryResolve({ success: false, error: 'session_not_found' });
      return;
    }
    // External session: attach-only, so probe existence first — this
    // registry must NEVER create an external session, only attach to one
    // that's already there.
    client.exec(`tmux has-session -t ${sessionName}`, {}, (execErr, checkStream) => {
      if (execErr || !checkStream) {
        client.end();
        tryResolve({ success: false, error: 'tmux_failed' });
        return;
      }
      let code: number | null = null;
      checkStream.on('exit', (c: number) => {
        code = c;
      });
      checkStream.on('close', () => {
        if (code !== 0) {
          client.end();
          tryResolve({ success: false, error: 'session_not_found' });
          return;
        }
        startTmux();
      });
      (checkStream as unknown as { resume?: () => void }).resume?.();
    });
  });

  client.on('error', (err: Error & { level?: string }) => {
    const error = err.level === 'client-authentication' ? ('auth_failed' as const) : ('unreachable' as const);
    tryResolve({ success: false, error });
  });

  return { client, promise };
}

function beginConnect(client: Client, host: string, port: number, credential: ResolvedCredential): void {
  client.connect({
    host,
    port,
    username: credential.username,
    privateKey: credential.privateKey,
    passphrase: credential.passphrase,
    debug: (msg: string) => console.log(`SSHTerminal[debug]> ${msg}`),
  });
}

// One full raw SSH+tmux connection attempt, credential already resolved —
// no registry bookkeeping. Used by the retry loop on an unexpected drop,
// where the credential is already cached on the connection and there's no
// async lookup to interleave with client creation.
function attemptSSHConnection(
  appId: string,
  host: string,
  port: number,
  credential: ResolvedCredential,
  sessionName?: string,
  writable = false
): Promise<AttemptResult> {
  const { client, promise } = createPendingAttempt(appId, sessionName, writable);
  beginConnect(client, host, port, credential);
  return promise;
}

export class SSHConnectionRegistry {
  private connections = new Map<string, SSHConnection>();
  // Deduplicates concurrent connect() calls for the same appId that have
  // no existing connection yet — without this, two viewers opening the
  // same brand-new app instance at once would each start their own
  // ssh2.Client, and the second to finish silently overwrites the first
  // in `connections`, orphaning (and never disconnecting) the first.
  private inFlightConnects = new Map<string, Promise<ConnectResult>>();

  public getConnection(appId: string): SSHConnection | undefined {
    return this.connections.get(appId);
  }

  public connect(appId: string, params: ConnectParams): Promise<ConnectResult> {
    if (params.sessionName !== undefined && !isValidSessionName(params.sessionName)) {
      return Promise.resolve({ success: false, error: 'session_not_found' });
    }

    const existing = this.inFlightConnects.get(appId);
    if (existing) return existing;

    const promise = this.doConnect(appId, params);
    this.inFlightConnects.set(appId, promise);
    promise.finally(() => {
      if (this.inFlightConnects.get(appId) === promise) {
        this.inFlightConnects.delete(appId);
      }
    });
    return promise;
  }

  // Resolves the credential to use for a connection attempt, without any
  // side effects (no persistence, no ssh2.Client). Shared by doConnect()
  // (which persists a newCredential on success and registers the resulting
  // connection) and listSessions() (which does neither — see its own doc
  // comment).
  private async resolveCredential(
    params: ConnectParams
  ): Promise<{ ok: true; credential: ResolvedCredential } | { ok: false; error: 'credential_unavailable' }> {
    if (params.credentialId) {
      let value;
      try {
        value = await SBCredentialsDB.getDecryptedValue(params.credentialId, params.ownerId);
      } catch (error) {
        return { ok: false, error: 'credential_unavailable' };
      }
      if (!value || value.type !== 'sshPrivateKey') {
        return { ok: false, error: 'credential_unavailable' };
      }
      return { ok: true, credential: { username: value.username, privateKey: value.privateKey, passphrase: value.passphrase } };
    }
    if (params.newCredential) {
      const v = params.newCredential.value;
      return { ok: true, credential: { username: v.username, privateKey: v.privateKey, passphrase: v.passphrase } };
    }
    return { ok: false, error: 'credential_unavailable' };
  }

  private async doConnect(appId: string, params: ConnectParams): Promise<ConnectResult> {
    // Create the client and wire its listeners synchronously — before the
    // (possibly async) credential lookup below — so they're already in
    // place the instant a real ssh2.Client would start emitting events.
    // External attaches always start read-only; a caller wanting write
    // access promotes the session later via a separate call, not here.
    const { client, promise } = createPendingAttempt(appId, params.sessionName, false);

    const resolved = await this.resolveCredential(params);
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }
    const credential = resolved.credential;

    beginConnect(client, params.host, params.port, credential);
    const attempt = await promise;
    if (!attempt.success) {
      return attempt;
    }

    const connection: SSHConnection = {
      client: attempt.client,
      stream: attempt.stream,
      outputListeners: new Set(),
      statusListeners: new Set(),
      credential,
      host: params.host,
      port: params.port,
      sessionName: params.sessionName,
      writable: false,
      reattaching: false,
      pendingWrites: [],
      deliberatelyClosed: false,
      initialOutput: [],
      hasHadListener: false,
      sizePinned: false,
    };
    this.connections.set(appId, connection);
    this.wireStream(appId, connection);

    // The caller (frontend) needs this back to persist it in the app's own
    // state — without it, leaving and returning to the board has no
    // credentialId to reconnect with, and the connect attempt fails with
    // credential_unavailable even though the credential exists.
    let resolvedCredentialId = params.credentialId;

    if (params.newCredential && !params.credentialId) {
      try {
        const saved = await SBCredentialsDB.createOrUpdate(
          params.ownerId,
          'sshPrivateKey',
          params.newCredential.name,
          params.newCredential.value
        );
        resolvedCredentialId = saved.id;
      } catch (error) {
        console.error(`Failed to persist newCredential for app ${appId}:`, error);
      }
    }

    if (!resolvedCredentialId) {
      return { success: false, error: 'credential_unavailable' };
    }

    return { success: true, credentialId: resolvedCredentialId };
  }

  // One-shot: open a connection, list the remote tmux sessions, then close.
  // Used to populate the "attach to an existing session" picker. Does NOT
  // persist a newCredential (nothing was created that's worth remembering)
  // and does NOT register the connection in `connections` — this is purely
  // a query, not a session the relay or setWritable()/disconnect() should
  // ever see.
  public async listSessions(
    params: ConnectParams
  ): Promise<{ success: true; sessions: string[] } | { success: false; error: 'auth_failed' | 'unreachable' | 'credential_unavailable' }> {
    const resolved = await this.resolveCredential(params);
    if (!resolved.ok) return { success: false, error: 'credential_unavailable' };

    return new Promise((resolve) => {
      const client = new Client();
      let out = '';
      client.on('ready', () => {
        client.exec("tmux list-sessions -F '#{session_name}'", {}, (execErr, stream) => {
          if (execErr || !stream) {
            client.end();
            resolve({ success: true, sessions: [] });
            return;
          }
          stream.on('data', (d: Buffer) => {
            out += d.toString('utf8');
          });
          stream.on('close', () => {
            client.end();
            // "no server running on ..." goes to stderr with a non-zero exit
            // and no stdout — out stays '' and this naturally resolves to [].
            const sessions = out
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean);
            resolve({ success: true, sessions });
          });
          (stream as unknown as { resume?: () => void }).resume?.();
        });
      });
      client.on('error', (err: Error & { level?: string }) => {
        resolve({ success: false, error: err.level === 'client-authentication' ? 'auth_failed' : 'unreachable' });
      });
      beginConnect(client, params.host, params.port, resolved.credential);
    });
  }

  // Attaches data/stderr/close handlers to a connection's current stream.
  // Called on the initial connect and again after each successful retry
  // (which replaces connection.stream with a fresh one).
  private wireStream(appId: string, connection: SSHConnection): void {
    const { stream } = connection;
    // Buffer output that arrives before the first subscriber (the tmux attach
    // paint), then forward directly once a listener has ever attached.
    const emit = (text: string) => {
      if (!connection.hasHadListener) {
        connection.initialOutput.push(text);
        return;
      }
      connection.outputListeners.forEach((listener) => listener(text));
    };
    stream.on('data', (data: Buffer) => emit(data.toString('utf8')));
    stream.stderr?.on('data', (data: Buffer) => emit(data.toString('utf8')));
    stream.on('close', () => {
      // A deliberate disconnect() already cleaned up, or a deliberate
      // re-attach (setWritable) is in flight on this connection and owns
      // the transition itself — either way, this isn't an unexpected drop.
      if (connection.deliberatelyClosed || connection.reattaching) return;
      connection.statusListeners.forEach((listener) => listener({ connected: false }));
      this.retryConnection(appId, connection);
    });
  }

  // Re-attaches the same external session on a fresh client with a new
  // writability, swapping it in on success. Used by "take control"
  // (read-only -> read-write) and its release. No-op for own sessions
  // (always read-write) and when the requested mode already matches.
  public setWritable(appId: string, writable: boolean): boolean {
    const connection = this.connections.get(appId);
    if (!connection || !connection.sessionName) return false; // external-only
    if (connection.writable === writable) return true;
    if (connection.reattaching) return true; // a re-attach is already in flight; ignore the duplicate

    connection.reattaching = true;
    const oldClient = connection.client;
    const oldStream = connection.stream;
    // The old stream can drop for a genuine unrelated reason while the
    // re-attach is in flight — its own 'close' handler skips the retry loop
    // because reattaching===true, so watch here whether that happened, to
    // decide the failure path below.
    let oldStreamClosed = false;
    const markOldStreamClosed = () => {
      oldStreamClosed = true;
    };
    oldStream.on('close', markOldStreamClosed);
    const attempt = attemptSSHConnection(
      appId,
      connection.host,
      connection.port,
      connection.credential,
      connection.sessionName,
      writable
    );
    attempt.then((result) => {
      // A disconnect()/fresh connect() may have replaced this connection
      // while we waited.
      if (this.connections.get(appId) !== connection) {
        oldStream.removeListener('close', markOldStreamClosed);
        return;
      }
      connection.reattaching = false;
      if (!result.success) {
        oldStream.removeListener('close', markOldStreamClosed);
        // Drain input buffered during the failed re-attach onto whatever stream
        // we're staying on (dropped by tmux if it's read-only, delivered if
        // not) and clear the buffer so it can't leak into a later re-attach.
        this.flushPendingWrites(connection);
        connection.statusListeners.forEach((listener) => listener({ connected: false, error: result.error }));
        // If the old stream already dropped while we were re-attaching, we
        // can't fall back to it — the connection would sit registered on a
        // dead stream with nothing ever retrying it. Reconnect instead.
        if (oldStreamClosed) this.retryConnection(appId, connection);
        return; // otherwise stay on the old (previous-mode) stream
      }
      // Swap the new client/stream in and wire it BEFORE tearing the old one
      // down, so the connection is never left unwired mid-transition.
      connection.client = result.client;
      connection.stream = result.stream;
      connection.writable = writable;
      this.wireStream(appId, connection);
      // Replay input typed during the re-attach window onto the new (now
      // read-write) stream, in order — these are the keystrokes write() parked
      // while reattaching, e.g. a command typed right after "take control".
      this.flushPendingWrites(connection);
      // Adopt the size the controller asked for while the re-attach was in
      // flight (resize() recorded it but couldn't apply it to the read-only
      // stream). Now that we're read-write, push it to the real tmux.
      if (writable && connection.geometry) {
        connection.stream.setWindow(connection.geometry.rows, connection.geometry.cols);
      }
      // Detach the OLD stream's handlers (retry-on-close, data, and the
      // marker above) so that ending the old client — which makes that stream
      // emit 'close' — can't be mistaken for an unexpected drop and fire the
      // retry loop, which would silently demote the session we just promoted.
      oldStream.removeAllListeners('close');
      oldStream.removeAllListeners('data');
      oldStream.stderr?.removeAllListeners('data');
      oldClient.end(); // detach the previous tmux client
      connection.statusListeners.forEach((listener) => listener({ connected: true }));
    });
    return true;
  }

  private async retryConnection(appId: string, connection: SSHConnection): Promise<void> {
    for (let attemptNumber = 1; attemptNumber <= RECONNECT_MAX_ATTEMPTS; attemptNumber++) {
      await delay(RECONNECT_BASE_DELAY_MS * 2 ** (attemptNumber - 1));

      // If disconnect() or a fresh connect() elsewhere replaced/removed
      // this connection while we were waiting, stop — we're retrying a
      // connection that's no longer the active one for this appId.
      if (this.connections.get(appId) !== connection) return;

      // External sessions always come back read-only on an automatic
      // reconnect, regardless of whatever writability they had before the
      // drop — a safety reset, not a preference the retry loop honors.
      const attempt = await attemptSSHConnection(
        appId,
        connection.host,
        connection.port,
        connection.credential,
        connection.sessionName,
        false
      );
      if (this.connections.get(appId) !== connection) return;

      if (attempt.success) {
        connection.client = attempt.client;
        connection.stream = attempt.stream;
        connection.writable = false; // external always comes back read-only
        this.wireStream(appId, connection);
        connection.statusListeners.forEach((listener) => listener({ connected: true }));
        return;
      }
    }

    // Retry budget exhausted — give up, remove the connection, and let the
    // relay's own lazy "next viewer triggers a fresh connect" behavior take
    // over from here.
    if (this.connections.get(appId) === connection) {
      connection.statusListeners.forEach((listener) => listener({ connected: false, error: 'unreachable' }));
      this.connections.delete(appId);
    }
  }

  public disconnect(appId: string): void {
    const connection = this.connections.get(appId);
    if (!connection) return;
    connection.deliberatelyClosed = true;
    connection.client.end();
    this.connections.delete(appId);
  }

  // Writes and clears any input parked by write() during a re-attach, onto the
  // connection's current stream, preserving order.
  private flushPendingWrites(connection: SSHConnection): void {
    if (connection.pendingWrites.length === 0) return;
    const buffered = connection.pendingWrites;
    connection.pendingWrites = [];
    for (const data of buffered) connection.stream.write(data);
  }

  public write(appId: string, data: string): boolean {
    const connection = this.connections.get(appId);
    if (!connection) return false;
    if (connection.reattaching) {
      // A take-control re-attach is in flight; connection.stream is still the
      // old (read-only) stream and tmux would silently drop this input. Park it
      // so setWritable() can replay it onto the new read-write stream — without
      // this, anything typed in the ~1-2s promote window is lost for good.
      connection.pendingWrites.push(data);
      return true;
    }
    connection.stream.write(data);
    return true;
  }

  public resize(appId: string, cols: number, rows: number): boolean {
    const connection = this.connections.get(appId);
    if (!connection) return false;
    // Size follows the shared board window for every session and every viewer
    // (external attaches no longer use `ignore-size`), so apply it unconditionally.
    connection.geometry = { cols, rows };
    // Resize this client's own pty so it renders the whole window cleanly.
    connection.stream.setWindow(rows, cols);
    // Own the tmux window size explicitly (Option A). tmux's default window-size
    // policy is `latest`, so when several clients are attached to one session
    // (multiple SAGE3 apps, or a SAGE3 app + a native terminal) the window flaps
    // to whoever resized last — a size race. Pin the window to `manual` (once) and
    // drive it with `resize-window`, so the board window deterministically owns
    // the size: the last resize wins, no continuous flapping. `resize-window` also
    // triggers a full tmux redraw (status bar included).
    const target = connection.sessionName ?? tmuxSessionName(appId);
    if (!connection.sizePinned) {
      connection.sizePinned = true;
      this.execControl(connection, `tmux set-window-option -t ${target} window-size manual`);
    }
    this.execControl(connection, `tmux resize-window -t ${target} -x ${cols} -y ${rows}`);
    return true;
  }

  // Run a fire-and-forget tmux control command on the connection's SSH client
  // (a fresh exec channel), draining and discarding its output. Used for the
  // out-of-band tmux commands (window-size / resize-window) that shape the
  // session without going through the interactive attach stream.
  private execControl(connection: SSHConnection, command: string): void {
    connection.client.exec(command, {}, (err, stream) => {
      if (err || !stream) return;
      stream.on('data', () => undefined);
      stream.on('close', () => undefined);
      if (stream.stderr) stream.stderr.on('data', () => undefined);
    });
  }

  // Captures the CURRENT visible screen of the shared tmux pane as a string
  // (with color/attribute escape sequences, via `-e`), on a fresh exec channel
  // over the same shared client. This is what a viewer joining an
  // already-open connection is sent so it paints the existing screen
  // immediately — the live output stream only carries bytes emitted AFTER the
  // viewer subscribes, so without this a viewer attaching to an idle session
  // (a static prompt) would stay blank until the next keystroke. tmux itself
  // is the source of truth here, so no server-side terminal emulation is
  // needed. Resolves null when there's no connection for the appId, or on an
  // exec error. Targets the external session name when attached to one,
  // otherwise this app's own sage3-<appId> session.
  public captureSnapshot(appId: string): Promise<string | null> {
    const connection = this.connections.get(appId);
    if (!connection) return Promise.resolve(null);
    const target = connection.sessionName ?? tmuxSessionName(appId);
    return new Promise((resolve) => {
      connection.client.exec(`tmux capture-pane -p -e -t ${target}`, {}, (execErr, stream) => {
        if (execErr || !stream) {
          resolve(null);
          return;
        }
        let out = '';
        stream.on('data', (data: Buffer) => {
          out += data.toString('utf8');
        });
        stream.on('close', () => resolve(out));
      });
    });
  }


  public onOutput(appId: string, listener: (data: string) => void): () => void {
    const connection = this.connections.get(appId);
    if (!connection) return () => undefined;
    connection.outputListeners.add(listener);
    // Flush any output buffered before this first subscriber (the initial tmux
    // attach/reattach paint), in order, then stop buffering for good.
    if (!connection.hasHadListener) {
      connection.hasHadListener = true;
      if (connection.initialOutput.length > 0) {
        const buffered = connection.initialOutput.join('');
        connection.initialOutput = [];
        listener(buffered);
      }
    }
    return () => connection.outputListeners.delete(listener);
  }

  public onStatus(appId: string, listener: (status: ConnectionStatus) => void): () => void {
    const connection = this.connections.get(appId);
    if (!connection) return () => undefined;
    connection.statusListeners.add(listener);
    return () => connection.statusListeners.delete(listener);
  }
}

export const sshConnectionRegistry = new SSHConnectionRegistry();
