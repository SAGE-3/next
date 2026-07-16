/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { EventEmitter } from 'events';
import { SBCredentialsDB, CredentialDecryptionError } from '@sage3/sagebase';
import { SSHConnectionRegistry } from './sshConnectionRegistry';

jest.mock('@sage3/sagebase', () => ({
  SBCredentialsDB: { getDecryptedValue: jest.fn() },
  CredentialDecryptionError: class CredentialDecryptionError extends Error {},
}));

// The real '@sage3/backend' barrel (libs/backend/src/index.ts) eagerly
// requires its entire export graph on load — including modules with
// pre-existing ESM/CJS interop issues unrelated to this registry (e.g.
// 'fuse.js' via a transitive @sage3/shared import) that this app's
// tsconfig.spec.json (no esModuleInterop) can't load at test time. Import
// the one real symbol this file needs directly from its source module,
// bypassing the barrel, rather than pulling in that whole graph just to
// get a single pure function. Production code still goes through the
// normal '@sage3/backend' package import — only this test's module
// resolution is narrowed.
jest.mock('@sage3/backend', () => ({
  isValidSessionName: jest.requireActual('../../../../libs/backend/src/lib/generics/sshTypes').isValidSessionName,
}));

// A fake ssh2.Client: connect()/exec() are driven by emitting the events
// real ssh2 would emit, so the registry's actual event-wiring is exercised,
// not just its happy-path return values.
class FakeStream extends EventEmitter {
  public stderr = new EventEmitter();
  public written: string[] = [];
  public windowChanges: Array<{ rows: number; cols: number }> = [];
  // Real ssh2 channels close once. Track it so FakeClient.end() doesn't
  // re-emit 'close' on a stream that already finished (which real ssh2 never
  // does, and which would otherwise re-enter handlers that call end() again).
  public closed = false;
  constructor() {
    super();
    this.on('close', () => {
      this.closed = true;
    });
  }
  write(data: string) {
    this.written.push(data);
    return true;
  }
  setWindow(rows: number, cols: number) {
    this.windowChanges.push({ rows, cols });
  }
  // Models a remote command finishing: real ssh2 streams emit 'exit' with
  // the process's exit code, then 'close'.
  emitExit(code: number) {
    this.emit('exit', code);
    this.emit('close');
  }
}

class FakeClient extends EventEmitter {
  public lastExecCommand: string | undefined;
  public execCommands: string[] = [];
  public lastStream: FakeStream | undefined;
  // Lets a test force the NEXT exec() call to fail, to exercise fallback
  // without needing a whole separate fake client subclass.
  public failNextExec = false;
  connect(_config: unknown) {
    return this;
  }
  exec(command: string, _opts: unknown, callback: (err: Error | undefined, stream: FakeStream) => void) {
    if (this.failNextExec) {
      this.failNextExec = false;
      callback(new Error('exec failed'), undefined as any);
      return;
    }
    this.lastExecCommand = command;
    this.execCommands.push(command);
    this.lastStream = new FakeStream();
    callback(undefined, this.lastStream);
  }
  end() {
    // Real ssh2: ending the client tears down its channel, so the active
    // stream emits 'close' too. The registry relies on that (e.g. disconnect()
    // sets deliberatelyClosed BEFORE end() precisely so this close is
    // recognized as deliberate) — model it here rather than only emitting on
    // the client, otherwise a whole class of stream-close bugs stays masked.
    // Only close a stream that's still open — real ssh2 doesn't re-close an
    // already-finished channel.
    if (this.lastStream && !this.lastStream.closed) {
      this.lastStream.emit('close');
    }
    this.emit('close');
  }
}

// The installed jest version (28) doesn't have the async fake-timer helpers
// (advanceTimersByTimeAsync etc. arrived in jest 29) — advanceTimersByTime()
// itself is synchronous and only runs due timer callbacks, it doesn't also
// drain the microtask queue that the resulting promise continuations queue
// up onto. So every advance is followed by a few plain microtask flushes to
// let those continuations (which are themselves synchronous up to the next
// await) actually run before assertions.
async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

let fakeClients: FakeClient[] = [];

jest.mock('ssh2', () => ({
  Client: jest.fn().mockImplementation(() => {
    const client = new FakeClient();
    fakeClients.push(client);
    return client;
  }),
}));

describe('SSHConnectionRegistry', () => {
  let registry: SSHConnectionRegistry;

  beforeEach(() => {
    fakeClients = [];
    jest.clearAllMocks();
    registry = new SSHConnectionRegistry();
  });

  function connectAndEmitReady(appId: string, params: any) {
    const connectPromise = registry.connect(appId, params);
    // Real ssh2 emits 'ready' asynchronously after connect(); simulate that.
    const client = fakeClients[fakeClients.length - 1];
    client.emit('ready');
    return connectPromise;
  }

  it('connects successfully: decrypts the credential, runs tmux new -A -s sage3-<appId>', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'deploy',
      privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----',
    });

    const result = await connectAndEmitReady('app-1', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      credentialId: 'cred-1',
    });

    expect(result).toEqual({ success: true, credentialId: 'cred-1' });
    expect(SBCredentialsDB.getDecryptedValue).toHaveBeenCalledWith('cred-1', 'user-1');
    const client = fakeClients[0];
    expect(client.lastExecCommand).toBe('tmux new -A -s sage3-app-1');
    expect(registry.getConnection('app-1')).toBeDefined();
  });

  it('returns credential_unavailable when the stored credential fails to decrypt', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockRejectedValue(new CredentialDecryptionError('bad'));

    const result = await registry.connect('app-2', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      credentialId: 'cred-1',
    });

    expect(result).toEqual({ success: false, error: 'credential_unavailable' });
    expect(registry.getConnection('app-2')).toBeUndefined();
  });

  it('resolves with credential_unavailable (never hangs/throws) when credential resolution fails with an unexpected error', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockRejectedValue(new Error('Redis connection lost'));

    const result = await registry.connect('app-2b', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      credentialId: 'cred-1',
    });

    expect(result).toEqual({ success: false, error: 'credential_unavailable' });
    expect(registry.getConnection('app-2b')).toBeUndefined();
  });

  it('returns unreachable when the SSH connection itself errors before ready with no distinguishing level', async () => {
    const connectPromise = registry.connect('app-3', {
      host: 'unreachable.example.com',
      port: 22,
      ownerId: 'user-1',
      newCredential: { name: 'x', value: { type: 'sshPrivateKey', username: 'u', privateKey: 'key' } },
    });
    const client = fakeClients[0];
    client.emit('error', new Error('ECONNREFUSED'));

    const result = await connectPromise;
    expect(result).toEqual({ success: false, error: 'unreachable' });
  });

  it("returns auth_failed when the ssh2 error carries level: 'client-authentication'", async () => {
    const connectPromise = registry.connect('app-3b', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      newCredential: { name: 'x', value: { type: 'sshPrivateKey', username: 'u', privateKey: 'key' } },
    });
    const client = fakeClients[0];
    client.emit('error', Object.assign(new Error('All configured authentication methods failed'), { level: 'client-authentication' }));

    const result = await connectPromise;
    expect(result).toEqual({ success: false, error: 'auth_failed' });
  });

  it('returns tmux_failed when exec itself errors', async () => {
    class FailingExecClient extends FakeClient {
      exec(_command: string, _opts: unknown, callback: (err: Error | undefined, stream: any) => void) {
        callback(new Error('exec failed'), undefined);
      }
    }
    fakeClients = [];
    (require('ssh2').Client as jest.Mock).mockImplementationOnce(() => {
      const client = new FailingExecClient();
      fakeClients.push(client);
      return client;
    });

    const connectPromise = registry.connect('app-4', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      newCredential: { name: 'x', value: { type: 'sshPrivateKey', username: 'u', privateKey: 'key' } },
    });
    fakeClients[0].emit('ready');

    const result = await connectPromise;
    expect(result).toEqual({ success: false, error: 'tmux_failed' });
  });

  it('persists a newCredential only after a successful connect', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue(undefined);
    const createOrUpdate = jest.fn().mockResolvedValue({ id: 'new-cred-id' });
    (SBCredentialsDB as any).createOrUpdate = createOrUpdate;

    const result = await connectAndEmitReady('app-5', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      newCredential: { name: 'my-key', value: { type: 'sshPrivateKey', username: 'u', privateKey: 'key' } },
    });

    expect(createOrUpdate).toHaveBeenCalledWith('user-1', 'sshPrivateKey', 'my-key', {
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    // The caller has no other way to learn the id of a credential it didn't
    // already have — without this, a later reconnect (e.g. leaving and
    // returning to the board) has no credentialId to look up.
    expect(result).toEqual({ success: true, credentialId: 'new-cred-id' });
  });

  it('does not persist a newCredential when the connect fails', async () => {
    const createOrUpdate = jest.fn();
    (SBCredentialsDB as any).createOrUpdate = createOrUpdate;

    const connectPromise = registry.connect('app-6', {
      host: 'bad.example.com',
      port: 22,
      ownerId: 'user-1',
      newCredential: { name: 'my-key', value: { type: 'sshPrivateKey', username: 'u', privateKey: 'key' } },
    });
    fakeClients[0].emit('error', new Error('ECONNREFUSED'));
    await connectPromise;

    expect(createOrUpdate).not.toHaveBeenCalled();
  });

  it('onOutput subscribers receive data written to the remote stream', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-7', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });

    const received: string[] = [];
    registry.onOutput('app-7', (data) => received.push(data));

    const client = fakeClients[0];
    client.lastStream!.emit('data', Buffer.from('hello'));

    expect(received).toEqual(['hello']);
  });

  it('write() sends data to the remote stream only if a connection exists', async () => {
    expect(registry.write('no-such-app', 'ls\n')).toBe(false);

    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-8', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });

    expect(registry.write('app-8', 'ls\n')).toBe(true);
    expect(fakeClients[0].lastStream!.written).toEqual(['ls\n']);
  });

  it('flushes output emitted before the first subscriber to that subscriber (tmux attach paint not lost on reconnect)', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-buf', { host: 'h', port: 22, ownerId: 'u', credentialId: 'cred-1' });

    // The tmux (re)attach paint arrives in the gap between connect() resolving
    // and the relay subscribing via onOutput — no subscriber exists yet.
    const stream = fakeClients[fakeClients.length - 1].lastStream!;
    stream.emit('data', Buffer.from('FIRST_4\r\n'));

    // The first viewer subscribes only now; it must still receive that paint,
    // otherwise a reconnecting viewer sees a blank pane (only later redraws).
    const received: string[] = [];
    registry.onOutput('app-buf', (d) => received.push(d));
    expect(received.join('')).toContain('FIRST_4');
  });

  it('stops buffering after the first subscriber (live output is delivered directly)', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-buf2', { host: 'h', port: 22, ownerId: 'u', credentialId: 'cred-1' });

    const received: string[] = [];
    registry.onOutput('app-buf2', (d) => received.push(d)); // subscribe first, buffer empty
    const stream = fakeClients[fakeClients.length - 1].lastStream!;
    stream.emit('data', Buffer.from('LIVE'));
    expect(received.join('')).toContain('LIVE');
  });

  it('resize() calls setWindow on the remote stream', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-9', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });

    // Capture the attach stream now — resize() runs extra exec channels
    // (window-size / resize-window) that would move client.lastStream.
    const attachStream = fakeClients[0].lastStream!;
    expect(registry.resize('app-9', 80, 24)).toBe(true);
    expect(attachStream.windowChanges).toEqual([{ rows: 24, cols: 80 }]);
  });

  it('resize() pins the tmux window-size to manual and drives resize-window (Option A: no size race)', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-9', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });

    registry.resize('app-9', 80, 24);
    expect(fakeClients[0].execCommands).toContain('tmux set-window-option -t sage3-app-9 window-size manual');
    expect(fakeClients[0].execCommands).toContain('tmux resize-window -t sage3-app-9 -x 80 -y 24');

    // window-size manual is pinned once, not on every resize; resize-window still runs.
    registry.resize('app-9', 100, 30);
    expect(fakeClients[0].execCommands.filter((c) => c.includes('window-size manual'))).toHaveLength(1);
    expect(fakeClients[0].execCommands).toContain('tmux resize-window -t sage3-app-9 -x 100 -y 30');
  });

  it('resize() applies setWindow for a read-only external session too (size follows the shared window)', async () => {
    // External attaches no longer use `ignore-size`, so the shared board window
    // drives the real remote session's size for every viewer, read-only included.
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    const p = registry.connect('app-ext-resize', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
    const client = fakeClients[fakeClients.length - 1];
    client.emit('ready');
    client.lastStream!.emitExit(0); // has-session ok -> attaches (read-only)
    await p;
    const attachStream = fakeClients[fakeClients.length - 1].lastStream!;

    expect(registry.resize('app-ext-resize', 42, 23)).toBe(true);
    expect(attachStream.windowChanges).toContainEqual({ rows: 23, cols: 42 });
  });

  it('resize() applies setWindow for a writable external session (controller drives the real tmux)', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({ type: 'sshPrivateKey', username: 'u', privateKey: 'key' });

    const p = registry.connect('app-ext-rw', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
    const client = fakeClients[fakeClients.length - 1];
    client.emit('ready');
    client.lastStream!.emitExit(0); // attached read-only
    await p;

    // Take control -> re-attach read-write.
    registry.setWritable('app-ext-rw', true);
    const newClient = fakeClients[fakeClients.length - 1];
    newClient.emit('ready');
    newClient.lastStream!.emitExit(0); // has-session probe ok -> read-write attach
    await flushMicrotasks();
    expect(registry.getConnection('app-ext-rw')?.writable).toBe(true);

    const rwStream = newClient.lastStream!;
    expect(registry.resize('app-ext-rw', 120, 40)).toBe(true);
    expect(rwStream.windowChanges).toContainEqual({ rows: 40, cols: 120 });
  });

  it('resize() applies immediately for a read-only external session and is re-applied on take-control', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({ type: 'sshPrivateKey', username: 'u', privateKey: 'key' });

    const p = registry.connect('app-ext-defer', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
    const client = fakeClients[fakeClients.length - 1];
    client.emit('ready');
    client.lastStream!.emitExit(0); // has-session probe ok -> attaches read-only
    await p;
    const roStream = client.lastStream!; // the read-only attach stream

    // A resize applies to the read-only stream immediately (size follows the window)...
    registry.resize('app-ext-defer', 99, 33);
    expect(roStream.windowChanges).toContainEqual({ rows: 33, cols: 99 });

    // ...and taking control re-applies the recorded geometry onto the new read-write stream.
    registry.setWritable('app-ext-defer', true);
    const newClient = fakeClients[fakeClients.length - 1];
    newClient.emit('ready');
    newClient.lastStream!.emitExit(0);
    await flushMicrotasks();
    expect(newClient.lastStream!.windowChanges).toContainEqual({ rows: 33, cols: 99 });
  });

  it('disconnect() ends the underlying connection and removes it from the registry', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });
    await connectAndEmitReady('app-10', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });

    registry.disconnect('app-10');

    expect(registry.getConnection('app-10')).toBeUndefined();
  });

  it('reconnecting after retries are exhausted passes through whatever ownerId parameter connect() is given, consistently across calls', async () => {
    // This is a correctness/passthrough test, not a security-boundary test:
    // it proves connect() forwards its `ownerId` parameter to
    // SBCredentialsDB.getDecryptedValue unchanged on repeated calls. It does
    // NOT prove anything about which identity a caller is allowed to supply —
    // this registry has no "stored" ownerId of its own and enforces nothing
    // about where that value comes from (see class doc comment). The actual
    // guarantee that a reconnect uses the app's persisted owner rather than a
    // triggering browser session's identity is enforced by the caller
    // (the WebSocket relay), not by this module.
    //
    // Updated for Finding 4 (automatic reconnect with a retry budget): a
    // stream close no longer removes the connection immediately — it now
    // stays registered (in a "retrying" state) until the retry budget is
    // exhausted. So this test drives the retry loop to exhaustion first,
    // then exercises the ownerId passthrough on the manual reconnect that
    // follows, same as before.
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });
      await connectAndEmitReady('app-11', { host: 'h', port: 22, ownerId: 'owner-user', credentialId: 'cred-1' });

      // Simulate the remote stream closing unexpectedly (network blip), and
      // drive the automatic retry loop through every attempt failing until
      // the retry budget is exhausted and the connection is removed.
      fakeClients[0].lastStream!.emit('close');
      for (const backoffMs of [1000, 2000, 4000]) {
        jest.advanceTimersByTime(backoffMs);
        await flushMicrotasks();
        fakeClients[fakeClients.length - 1].emit('error', new Error('ECONNREFUSED'));
        await flushMicrotasks();
      }
      expect(registry.getConnection('app-11')).toBeUndefined();

      // A later reconnect call with the same ownerId parameter must pass it
      // through to SBCredentialsDB.getDecryptedValue unchanged.
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockClear();
      await connectAndEmitReady('app-11', { host: 'h', port: 22, ownerId: 'owner-user', credentialId: 'cred-1' });
      expect(SBCredentialsDB.getDecryptedValue).toHaveBeenCalledWith('cred-1', 'owner-user');
    } finally {
      jest.useRealTimers();
    }
  });

  it('dedups concurrent connect() calls for the same not-yet-connected appId into a single ssh2.Client', async () => {
    (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'key',
    });

    const params = { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' };
    // Two viewers racing to connect the same brand-new appId — neither
    // await is resolved before the second call starts.
    const firstPromise = registry.connect('app-12', params);
    const secondPromise = registry.connect('app-12', params);

    // Only one FakeClient should have been constructed for this appId.
    expect(fakeClients.length).toBe(1);

    fakeClients[0].emit('ready');

    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
    expect(firstResult).toEqual({ success: true, credentialId: 'cred-1' });
    expect(secondResult).toEqual({ success: true, credentialId: 'cred-1' });
    expect(fakeClients.length).toBe(1);
    expect(registry.getConnection('app-12')).toBeDefined();
  });

  describe('external session attach path', () => {
    it('external mode: has-session ok -> attaches read-only', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', {
        host: 'h',
        port: 22,
        ownerId: 'u',
        credentialId: 'c',
        sessionName: 'demo-session',
      });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');

      // first exec is the has-session probe:
      expect(client.lastExecCommand).toBe('tmux has-session -t demo-session');
      client.lastStream!.emitExit(0); // session exists
      expect(client.lastExecCommand).toBe('tmux attach -r -t demo-session');

      await expect(p).resolves.toEqual({ success: true, credentialId: 'c' });
    });

    it('external mode: has-session non-zero -> session_not_found, no attach', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', {
        host: 'h',
        port: 22,
        ownerId: 'u',
        credentialId: 'c',
        sessionName: 'ghost',
      });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');

      client.lastStream!.emitExit(1); // no such session

      await expect(p).resolves.toEqual({ success: false, error: 'session_not_found' });
      expect(client.lastExecCommand).toBe('tmux has-session -t ghost'); // never attached
    });

    it('rejects an invalid session name before touching SSH', async () => {
      const p = registry.connect('app1', {
        host: 'h',
        port: 22,
        ownerId: 'u',
        credentialId: 'c',
        sessionName: 'a;rm -rf',
      });

      await expect(p).resolves.toEqual({ success: false, error: 'session_not_found' });
      expect(fakeClients.length).toBe(0); // rejected before any ssh2.Client was created
    });
  });

  describe('listSessions', () => {
    it('parses tmux list-sessions output', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.listSessions({ host: 'h', port: 22, ownerId: 'u', credentialId: 'c' });
      // resolveCredential awaits the (mocked, async) getDecryptedValue before
      // constructing the ssh2.Client, so the client doesn't exist yet here.
      await flushMicrotasks();

      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      expect(client.lastExecCommand).toBe("tmux list-sessions -F '#{session_name}'");
      client.lastStream!.emit('data', Buffer.from('demo-session\nother\n'));
      client.lastStream!.emitExit(0);

      await expect(p).resolves.toEqual({ success: true, sessions: ['demo-session', 'other'] });
    });

    it('returns [] when no tmux server is running', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.listSessions({ host: 'h', port: 22, ownerId: 'u', credentialId: 'c' });
      await flushMicrotasks();

      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.stderr.emit('data', Buffer.from('no server running on /tmp/tmux-1000/default\n'));
      client.lastStream!.emitExit(1);

      await expect(p).resolves.toEqual({ success: true, sessions: [] });
    });

    it('does not persist a newCredential and does not register the connection', async () => {
      const createOrUpdate = jest.fn();
      (SBCredentialsDB as any).createOrUpdate = createOrUpdate;

      const p = registry.listSessions({
        host: 'h',
        port: 22,
        ownerId: 'u',
        newCredential: { name: 'my-key', value: { type: 'sshPrivateKey', username: 'u', privateKey: 'key' } },
      });
      await flushMicrotasks();

      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0);

      await expect(p).resolves.toEqual({ success: true, sessions: [] });
      expect(createOrUpdate).not.toHaveBeenCalled();
      // Assert on the connections map itself: listSessions is a one-shot query
      // and must never register a connection under ANY key. (Asserting on a
      // specific appId would be vacuous — ConnectParams has no appId, so no
      // guessed key could ever match a wrongly-registered entry.)
      expect((registry as any).connections.size).toBe(0);
    });
  });

  describe('captureSnapshot', () => {
    async function connectOwn(appId: string) {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });
      await connectAndEmitReady(appId, { host: 'h', port: 22, ownerId: 'u', credentialId: 'c' });
    }

    it('runs capture-pane against the own session and resolves the accumulated screen contents', async () => {
      await connectOwn('app-snap');
      const client = fakeClients[0];

      const p = registry.captureSnapshot('app-snap');
      // captureSnapshot runs a fresh exec channel on the SAME shared client,
      // which replaces client.lastStream with the capture channel's stream.
      expect(client.lastExecCommand).toBe('tmux capture-pane -p -e -t sage3-app-snap');
      client.lastStream!.emit('data', Buffer.from('$ echo hi\n'));
      client.lastStream!.emit('data', Buffer.from('hi\n$ '));
      client.lastStream!.emitExit(0);

      await expect(p).resolves.toBe('$ echo hi\nhi\n$ ');
    });

    it('targets the external session name when attached to an existing session', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });
      const p = registry.connect('app-snap-ext', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0); // has-session ok -> attaches read-only
      await p;

      const snap = registry.captureSnapshot('app-snap-ext');
      expect(client.lastExecCommand).toBe('tmux capture-pane -p -e -t demo-session');
      client.lastStream!.emitExit(0);
      await snap;
    });

    it('resolves null when there is no connection for the appId', async () => {
      await expect(registry.captureSnapshot('no-such-app')).resolves.toBeNull();
    });
  });

  describe('setWritable', () => {
    it('buffers input typed during the take-control re-attach and flushes it to the new read-write stream', async () => {
      // Reproduces the build #57 "take control -> typed command produced no
      // output" race: the promote-to-read-write re-attach is async (~1-2s), and
      // input during that window must not be written to the old read-only stream
      // (tmux drops it) — it must be replayed onto the new read-write stream.
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0); // attached read-only
      await p;
      const oldReadOnlyStream = fakeClients[fakeClients.length - 1].lastStream!;

      // Take control -> a re-attach is now in flight (reattaching === true).
      expect(registry.setWritable('app1', true)).toBe(true);

      // The user types immediately (as the e2e test did). It must NOT hit the
      // old read-only stream, which tmux would silently drop.
      expect(registry.write('app1', 'echo ro-42\n')).toBe(true);
      expect(oldReadOnlyStream.written).toEqual([]);

      // Complete the read-write re-attach.
      const newClient = fakeClients[fakeClients.length - 1];
      newClient.emit('ready');
      newClient.lastStream!.emitExit(0); // has-session probe ok -> read-write attach
      await flushMicrotasks();

      // The buffered keystrokes were replayed onto the new read-write stream.
      const newReadWriteStream = newClient.lastStream!;
      expect(newReadWriteStream.written).toEqual(['echo ro-42\n']);
      // A subsequent write goes straight through (no longer buffered).
      expect(registry.write('app1', 'ls\n')).toBe(true);
      expect(newReadWriteStream.written).toEqual(['echo ro-42\n', 'ls\n']);
    });

    it('re-attaches read-write on the same appId without triggering retry', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0); // attached read-only
      await p;
      expect(registry.getConnection('app1')?.writable).toBe(false);

      const statuses: Array<{ connected: boolean; error?: string }> = [];
      registry.onStatus('app1', (status) => statuses.push(status));

      const ok = registry.setWritable('app1', true);
      expect(ok).toBe(true);

      // The re-attach opens a fresh client (probe + attach), distinct from
      // the original one, which must stay untouched until it succeeds.
      const newClient = fakeClients[fakeClients.length - 1];
      expect(newClient).not.toBe(client);
      newClient.emit('ready');
      expect(newClient.lastExecCommand).toBe('tmux has-session -t demo-session');
      newClient.lastStream!.emitExit(0);
      expect(newClient.lastExecCommand).toBe('tmux attach -t demo-session');

      await flushMicrotasks();

      expect(registry.getConnection('app1')?.writable).toBe(true);
      expect(registry.getConnection('app1')?.client).toBe(newClient);
      expect(statuses).toEqual([{ connected: true }]);
    });

    it('a second concurrent setWritable() call while a re-attach is already in flight is ignored (no second client leaked, still returns true)', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0); // attached read-only
      await p;

      // First call starts a re-attach (a fresh client, not yet 'ready').
      expect(registry.setWritable('app1', true)).toBe(true);
      const clientsAfterFirstCall = fakeClients.length;

      // A double-click (or any second concurrent call) while that re-attach
      // is still in flight must be ignored — it must NOT start a second
      // re-attach and orphan a client.
      expect(registry.setWritable('app1', true)).toBe(true);
      expect(fakeClients.length).toBe(clientsAfterFirstCall);

      // Let the in-flight re-attach finish normally; nothing extra was spawned.
      const promoteClient = fakeClients[fakeClients.length - 1];
      promoteClient.emit('ready');
      promoteClient.lastStream!.emitExit(0);
      await flushMicrotasks();

      expect(registry.getConnection('app1')?.writable).toBe(true);
      expect(fakeClients.length).toBe(clientsAfterFirstCall);
    });

    it('is a no-op for own sessions', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });
      await connectAndEmitReady('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c' });

      expect(registry.setWritable('app1', true)).toBe(false);
    });

    it('returns false for an unknown appId', () => {
      expect(registry.setWritable('no-such-app', true)).toBe(false);
    });

    it('is a no-op when the requested mode already matches', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0);
      await p;

      expect(registry.setWritable('app1', false)).toBe(true);
      // No new client should have been created — already read-only.
      expect(fakeClients.length).toBe(1);
    });

    it('stays on the old read-only stream and broadcasts an error when the re-attach fails', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0);
      await p;

      const statuses: Array<{ connected: boolean; error?: string }> = [];
      registry.onStatus('app1', (status) => statuses.push(status));

      expect(registry.setWritable('app1', true)).toBe(true);
      const newClient = fakeClients[fakeClients.length - 1];
      newClient.emit('error', new Error('ECONNREFUSED'));
      await flushMicrotasks();

      expect(registry.getConnection('app1')?.writable).toBe(false);
      expect(registry.getConnection('app1')?.client).toBe(client); // stayed on old client
      expect(statuses).toEqual([{ connected: false, error: 'unreachable' }]);
    });

    it('take control stays read-write: tearing down the old client must not trigger a parasitic retry that demotes back to read-only (regression)', async () => {
      // Reproduces the CRITICAL bug: after a successful promote, ending the
      // OLD client makes its stream emit 'close' (as real ssh2 does). If the
      // registry hasn't detached that stream's handlers first, the close is
      // mistaken for an unexpected drop, a retry fires ~1s later, re-attaches
      // read-only and silently demotes the session we just promoted.
      jest.useFakeTimers({ doNotFake: ['performance'] });
      try {
        (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
          type: 'sshPrivateKey',
          username: 'u',
          privateKey: 'key',
        });

        const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
        const client = fakeClients[fakeClients.length - 1];
        client.emit('ready');
        client.lastStream!.emitExit(0); // attached read-only
        await p;

        const statuses: Array<{ connected: boolean; error?: string }> = [];
        registry.onStatus('app1', (status) => statuses.push(status));

        expect(registry.setWritable('app1', true)).toBe(true);
        const promoteClient = fakeClients[fakeClients.length - 1];
        promoteClient.emit('ready');
        promoteClient.lastStream!.emitExit(0); // attached read-write
        await flushMicrotasks();

        expect(registry.getConnection('app1')?.writable).toBe(true);
        const clientsAfterPromote = fakeClients.length;

        // Advance well past every backoff — a parasitic retry, if one were
        // wired, would fire in this window.
        jest.advanceTimersByTime(10000);
        await flushMicrotasks();

        expect(fakeClients.length).toBe(clientsAfterPromote); // no re-attach client spawned
        expect(registry.getConnection('app1')?.writable).toBe(true); // still read-write
        expect(registry.getConnection('app1')?.client).toBe(promoteClient);
        // No read-only re-attach command was ever issued afterward, and no
        // disconnect blip was broadcast — exactly one promote status.
        expect(promoteClient.lastExecCommand).toBe('tmux attach -t demo-session');
        expect(statuses).toEqual([{ connected: true }]);
      } finally {
        jest.useRealTimers();
      }
    });

    it('reconnects instead of dying permanently when the old stream drops mid-re-attach and the re-attach then fails (regression)', async () => {
      // Reproduces the IMPORTANT bug: if the old stream drops for a genuine
      // unrelated reason while a re-attach is in flight (guarded out by
      // reattaching), and that re-attach then FAILS, the failure path must not
      // leave the connection stranded on the dead old stream with no retry.
      jest.useFakeTimers({ doNotFake: ['performance'] });
      try {
        (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
          type: 'sshPrivateKey',
          username: 'u',
          privateKey: 'key',
        });

        const p = registry.connect('app1', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
        const client = fakeClients[fakeClients.length - 1];
        client.emit('ready');
        client.lastStream!.emitExit(0);
        await p;
        const oldStream = client.lastStream!;

        expect(registry.setWritable('app1', true)).toBe(true);
        const promoteClient = fakeClients[fakeClients.length - 1];

        // Old stream dies (guarded out by reattaching), then the re-attach fails.
        oldStream.emit('close');
        promoteClient.emit('error', new Error('ECONNREFUSED'));
        await flushMicrotasks();

        // The connection must survive and schedule a reconnect rather than sit
        // dead on the closed old stream.
        expect(registry.getConnection('app1')).toBeDefined();
        jest.advanceTimersByTime(1000);
        await flushMicrotasks();

        const retryClient = fakeClients[fakeClients.length - 1];
        expect(retryClient).not.toBe(promoteClient); // a fresh reconnect attempt fired
        retryClient.emit('ready');
        expect(retryClient.lastExecCommand).toBe('tmux has-session -t demo-session');
        retryClient.lastStream!.emitExit(0);
        await flushMicrotasks();

        expect(registry.getConnection('app1')?.writable).toBe(false); // came back read-only
        expect(registry.getConnection('app1')?.client).toBe(retryClient);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('automatic reconnect on an unexpected drop', () => {
    beforeEach(() => {
      // doNotFake: ['performance'] works around a @sinonjs/fake-timers
      // incompatibility with newer Node versions, where `performance` is a
      // non-configurable global and hijacking it throws
      // "Cannot assign to read only property 'performance'" /
      // "Can't install fake timers twice on the same global object." This
      // repo's tests don't otherwise use fake timers, so there's no
      // existing convention to match here.
      jest.useFakeTimers({ doNotFake: ['performance'] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('broadcasts {connected: false} immediately, then retries and broadcasts {connected: true} on success', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const connectPromise = registry.connect('app-13', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });
      fakeClients[0].emit('ready');
      await connectPromise;

      const statuses: Array<{ connected: boolean; error?: string }> = [];
      registry.onStatus('app-13', (status) => statuses.push(status));

      // Simulate an unexpected drop (not a disconnect() call).
      fakeClients[0].lastStream!.emit('close');

      expect(statuses).toEqual([{ connected: false }]);
      expect(fakeClients.length).toBe(1); // no retry attempt yet — still waiting on backoff

      // Advance through the first backoff delay so the retry attempt fires.
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
      expect(fakeClients.length).toBe(2);

      fakeClients[1].emit('ready');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(statuses).toEqual([{ connected: false }, { connected: true }]);
      expect(registry.getConnection('app-13')).toBeDefined();
    });

    it('gives up after exhausting the retry budget and broadcasts a final failure status', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const connectPromise = registry.connect('app-14', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });
      fakeClients[0].emit('ready');
      await connectPromise;

      const statuses: Array<{ connected: boolean; error?: string }> = [];
      registry.onStatus('app-14', (status) => statuses.push(status));

      fakeClients[0].lastStream!.emit('close');
      expect(statuses).toEqual([{ connected: false }]);

      // Attempt 1: fails after 1000ms backoff.
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
      expect(fakeClients.length).toBe(2);
      fakeClients[1].emit('error', new Error('ECONNREFUSED'));
      await Promise.resolve();
      await Promise.resolve();

      // Attempt 2: fails after 2000ms backoff.
      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(fakeClients.length).toBe(3);
      fakeClients[2].emit('error', new Error('ECONNREFUSED'));
      await Promise.resolve();
      await Promise.resolve();

      // Attempt 3: fails after 4000ms backoff — retry budget now exhausted.
      jest.advanceTimersByTime(4000);
      await flushMicrotasks();
      expect(fakeClients.length).toBe(4);
      fakeClients[3].emit('error', new Error('ECONNREFUSED'));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(statuses).toEqual([{ connected: false }, { connected: false, error: 'unreachable' }]);
      expect(registry.getConnection('app-14')).toBeUndefined();
    });

    it('does not retry after a deliberate disconnect()', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const connectPromise = registry.connect('app-15', { host: 'h', port: 22, ownerId: 'user-1', credentialId: 'cred-1' });
      fakeClients[0].emit('ready');
      await connectPromise;

      expect(fakeClients.length).toBe(1);
      const stream = fakeClients[0].lastStream!;

      registry.disconnect('app-15');
      expect(registry.getConnection('app-15')).toBeUndefined();

      // In real ssh2, ending the client eventually causes its stream to
      // emit 'close' too — simulate that here to exercise the
      // deliberatelyClosed guard in wireStream's own 'close' handler
      // (rather than trivially passing just because FakeClient.end()
      // happens not to touch the stream).
      stream.emit('close');

      // Advance well past every possible backoff delay — no retry should
      // ever fire because the deliberate-close path skips the retry loop.
      jest.advanceTimersByTime(10000);
      await flushMicrotasks();

      expect(fakeClients.length).toBe(1);
      expect(registry.getConnection('app-15')).toBeUndefined();
    });

    it('retry re-attaches an external session read-only regardless of prior writable (safety reset)', async () => {
      (SBCredentialsDB.getDecryptedValue as jest.Mock).mockResolvedValue({
        type: 'sshPrivateKey',
        username: 'u',
        privateKey: 'key',
      });

      const p = registry.connect('app-16', { host: 'h', port: 22, ownerId: 'u', credentialId: 'c', sessionName: 'demo-session' });
      const client = fakeClients[fakeClients.length - 1];
      client.emit('ready');
      client.lastStream!.emitExit(0); // attached read-only
      await p;

      // Promote to read-write.
      expect(registry.setWritable('app-16', true)).toBe(true);
      const promoteClient = fakeClients[fakeClients.length - 1];
      promoteClient.emit('ready');
      promoteClient.lastStream!.emitExit(0);
      await flushMicrotasks();
      expect(registry.getConnection('app-16')?.writable).toBe(true);

      // Unexpected drop of the now-read-write stream.
      const activeStream = fakeClients[fakeClients.length - 1].lastStream!;
      activeStream.emit('close');
      await flushMicrotasks();

      // Advance through the first backoff so the retry attempt fires.
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();

      const retryClient = fakeClients[fakeClients.length - 1];
      expect(retryClient).not.toBe(promoteClient);
      retryClient.emit('ready');
      expect(retryClient.lastExecCommand).toBe('tmux has-session -t demo-session');
      retryClient.lastStream!.emitExit(0);
      expect(retryClient.lastExecCommand).toBe('tmux attach -r -t demo-session');
      await flushMicrotasks();

      expect(registry.getConnection('app-16')?.writable).toBe(false); // reset by the retry
    });
  });
});

import { tmuxCommand } from './sshConnectionRegistry';

describe('tmuxCommand', () => {
  it('own session: attach-or-create the per-app session', () => {
    expect(tmuxCommand('app1', undefined, false)).toBe('tmux new -A -s sage3-app1');
    expect(tmuxCommand('app1', undefined, true)).toBe('tmux new -A -s sage3-app1');
  });
  it('external read-only: attach with -r, no ignore-size (size follows the shared window), never create', () => {
    expect(tmuxCommand('app1', 'demo-session', false)).toBe('tmux attach -r -t demo-session');
  });
  it('external read-write: attach without -r or ignore-size (controller may resize the real tmux)', () => {
    expect(tmuxCommand('app1', 'demo-session', true)).toBe('tmux attach -t demo-session');
  });
});
