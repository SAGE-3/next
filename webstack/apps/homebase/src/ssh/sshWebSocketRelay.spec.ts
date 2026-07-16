/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { EventEmitter } from 'events';
import { SSHConnectionRegistry } from './sshConnectionRegistry';
import { attachSSHWebSocketServer } from './sshWebSocketRelay';

// sshConnectionRegistry.ts imports isValidSessionName from '@sage3/backend'
// by value now, so requiring it (even indirectly, via SSHConnectionRegistry
// above) eagerly evaluates that whole barrel (libs/backend/src/index.ts),
// which transitively pulls in a 'fuse.js' import this app's tsconfig.spec
// .json (no esModuleInterop) can't load. This test never calls connect()
// for real (registry.connect is always mocked below), so it has no need
// for the real backend module at all — see the identical note in
// sshConnectionRegistry.spec.ts for the full explanation.
jest.mock('@sage3/backend', () => ({
  isValidSessionName: jest.requireActual('../../../../libs/backend/src/lib/generics/sshTypes').isValidSessionName,
  isHostAllowed: jest.requireActual('../../../../libs/backend/src/lib/generics/sshTypes').isHostAllowed,
}));

class FakeSocket extends EventEmitter {
  public sent: string[] = [];
  public closed = false;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
}

class FakeWSServer extends EventEmitter {}

// Flushes several microtask turns — used where a test needs the connection
// handler's execution to proceed PAST the `await registry.connect(...)`
// line (not just past `await getAppState(...)`, which is all the simpler
// existing tests below need two `await Promise.resolve()` for).
async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function appState(
  overrides: Partial<{
    ownerId: string;
    credentialId: string;
    host: string;
    port: number;
    controllerId: string;
    sessionName: string;
  }> = {}
) {
  return { host: 'h', port: 22, ownerId: 'owner-1', credentialId: 'cred-1', controllerId: 'owner-1', ...overrides };
}

// getAppState is async in production (a Redis read via AppsCollection.get),
// so every test double for it must return a Promise too — this is what
// actually exercises the awaits inside attachSSHWebSocketServer, rather
// than accidentally passing with a synchronous stand-in that wouldn't
// catch a missing `await` in the implementation.
function asyncAppState(overrides: Parameters<typeof appState>[0] = {}) {
  return async () => appState(overrides);
}

describe('sshWebSocketRelay', () => {
  let registry: SSHConnectionRegistry;

  beforeEach(() => {
    registry = new SSHConnectionRegistry();
    jest.spyOn(registry, 'onOutput');
    jest.spyOn(registry, 'onStatus');
    jest.spyOn(registry, 'write').mockReturnValue(true);
    jest.spyOn(registry, 'resize').mockReturnValue(true);
    jest.spyOn(registry, 'connect').mockResolvedValue({ success: true, credentialId: 'cred-1' });
    jest.spyOn(registry, 'getConnection').mockReturnValue({} as any);
    jest.spyOn(registry, 'disconnect').mockImplementation(() => undefined);
    jest.spyOn(registry, 'setWritable').mockReturnValue(true);
    jest.spyOn(registry, 'captureSnapshot').mockResolvedValue(null);
  });

  function connectClient(wsServer: FakeWSServer, appId: string, userId: string) {
    const socket = new FakeSocket();
    wsServer.emit('connection', socket, { user: { id: userId }, url: `/ssh?appId=${appId}` });
    return socket;
  }

  it('broadcasts output to every connected viewer for the same appId', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState(), ['h']);

    const viewerA = connectClient(wsServer, 'app-1', 'user-a');
    const viewerB = connectClient(wsServer, 'app-1', 'user-b');
    await Promise.resolve(); // let the async getAppState()/connect() settle
    await Promise.resolve();

    const outputCallback = (registry.onOutput as jest.Mock).mock.calls[0][1];
    outputCallback('hello from remote');

    expect(JSON.parse(viewerA.sent[viewerA.sent.length - 1])).toEqual({ type: 'output', data: 'hello from remote' });
    expect(JSON.parse(viewerB.sent[viewerB.sent.length - 1])).toEqual({ type: 'output', data: 'hello from remote' });
  });

  it('writes input from the owner in private mode (the default)', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'owner-1' }), ['h']);

    const owner = connectClient(wsServer, 'app-2', 'owner-1');
    await flushMicrotasks();

    owner.emit('message', JSON.stringify({ type: 'input', data: 'ls\n' }));
    await flushMicrotasks();

    expect(registry.write).toHaveBeenCalledWith('app-2', 'ls\n');
  });

  it('drops input from a non-owner in private mode (default), even a would-be controller', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'owner-1', controllerId: 'user-b' }), ['h']);

    const nonController = connectClient(wsServer, 'app-3', 'user-b');
    await Promise.resolve();
    await Promise.resolve();

    nonController.emit('message', JSON.stringify({ type: 'input', data: 'rm -rf /\n' }));
    await Promise.resolve();

    expect(registry.write).not.toHaveBeenCalled();
  });

  it('shared mode: after the owner enables sharing, the current controller (a non-owner) can type', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'owner-1', controllerId: 'user-b' }), ['h']);
    const owner = connectClient(wsServer, 'app-sc', 'owner-1');
    const nonController = connectClient(wsServer, 'app-sc', 'user-b');
    await flushMicrotasks();

    // non-owner controller is blocked in private mode
    nonController.emit('message', JSON.stringify({ type: 'input', data: 'a' }));
    await flushMicrotasks();
    expect(registry.write).not.toHaveBeenCalled();

    // owner enables sharing -> broadcast; now the controller can type
    owner.emit('message', JSON.stringify({ type: 'setSharedControl', shared: true }));
    await flushMicrotasks();
    expect(nonController.sent.map((s) => JSON.parse(s))).toContainEqual({ type: 'sharedControl', shared: true });
    nonController.emit('message', JSON.stringify({ type: 'input', data: 'id\n' }));
    await flushMicrotasks();
    expect(registry.write).toHaveBeenCalledWith('app-sc', 'id\n');
  });

  it('setSharedControl from a non-owner is dropped', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'owner-1', controllerId: 'user-b' }), ['h']);
    const nonOwner = connectClient(wsServer, 'app-scn', 'user-b');
    await flushMicrotasks();
    nonOwner.emit('message', JSON.stringify({ type: 'setSharedControl', shared: true }));
    nonOwner.emit('message', JSON.stringify({ type: 'input', data: 'x' }));
    await flushMicrotasks();
    expect(registry.write).not.toHaveBeenCalled();
  });

  it('a joining viewer receives the current sharedControl (default false)', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'owner-1' }), ['h']);
    const v = connectClient(wsServer, 'app-scj', 'owner-1');
    await flushMicrotasks();
    expect(v.sent.map((s) => JSON.parse(s))).toContainEqual({ type: 'sharedControl', shared: false });
  });

  it('forwards a resize message to the registry', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ controllerId: 'user-a' }), ['h']);

    const controller = connectClient(wsServer, 'app-4', 'user-a');
    await Promise.resolve();
    await Promise.resolve();

    controller.emit('message', JSON.stringify({ type: 'resize', cols: 100, rows: 40 }));
    await flushMicrotasks();

    expect(registry.resize).toHaveBeenCalledWith('app-4', 100, 40);
  });

  it('honors a resize from any viewer (size is decoupled from control; it follows the shared window)', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ controllerId: 'user-a' }), ['h']);

    const nonController = connectClient(wsServer, 'app-rz1', 'user-b');
    await flushMicrotasks();

    nonController.emit('message', JSON.stringify({ type: 'resize', cols: 100, rows: 40 }));
    await flushMicrotasks();

    expect(registry.resize).toHaveBeenCalledWith('app-rz1', 100, 40);
  });

  it('triggers a connect using the app state ownerId/credentialId, not the connecting viewer identity, when no connection exists yet', async () => {
    (registry.getConnection as jest.Mock).mockReturnValue(undefined);
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'the-real-owner', credentialId: 'the-real-cred' }), ['h']);

    connectClient(wsServer, 'app-5', 'some-other-viewer');
    await Promise.resolve();
    await Promise.resolve();

    expect(registry.connect).toHaveBeenCalledWith('app-5', {
      host: 'h',
      port: 22,
      ownerId: 'the-real-owner',
      credentialId: 'the-real-cred',
    });
  });

  it('reports a failed connect via a status message and does not poison the appId subscription for a later successful viewer', async () => {
    (registry.getConnection as jest.Mock).mockReturnValue(undefined);
    (registry.connect as jest.Mock).mockResolvedValueOnce({ success: false, error: 'unreachable' });

    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState(), ['h']);

    const viewerA = connectClient(wsServer, 'app-6', 'user-a');
    await flushMicrotasks();

    expect(JSON.parse(viewerA.sent[viewerA.sent.length - 1])).toEqual({
      type: 'status',
      connected: false,
      error: 'unreachable',
    });
    // A failed connect must not leave a bogus entry in the relay's internal
    // unsubscribeByApp map — otherwise a later successful viewer for the
    // same appId would silently ride along on a subscription that was
    // never actually made against a real connection.
    expect(registry.onOutput).not.toHaveBeenCalled();
    expect(registry.onStatus).not.toHaveBeenCalled();

    // Now a second viewer connects, and this time the connect succeeds.
    (registry.connect as jest.Mock).mockResolvedValueOnce({ success: true });
    (registry.getConnection as jest.Mock).mockReturnValue(undefined);

    const viewerB = connectClient(wsServer, 'app-6', 'user-b');
    await flushMicrotasks();

    expect(registry.onOutput).toHaveBeenCalledWith('app-6', expect.any(Function));
    expect(registry.onStatus).toHaveBeenCalledWith('app-6', expect.any(Function));
  });

  it('calls registry.disconnect(appId) when the last viewer for an appId disconnects', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState(), ['h']);

    const socket = connectClient(wsServer, 'app-7', 'user-a');
    await Promise.resolve();
    await Promise.resolve();

    socket.emit('close');

    expect(registry.disconnect).toHaveBeenCalledWith('app-7');
  });

  it('carries sessionName when lazily reconnecting', async () => {
    (registry.getConnection as jest.Mock).mockReturnValue(undefined);
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(
      wsServer as any,
      registry,
      asyncAppState({ ownerId: 'the-real-owner', credentialId: 'the-real-cred', sessionName: 'demo-session' }),
      ['h']
    );

    connectClient(wsServer, 'app-8', 'some-other-viewer');
    await Promise.resolve();
    await Promise.resolve();

    expect(registry.connect).toHaveBeenCalledWith('app-8', {
      host: 'h',
      port: 22,
      ownerId: 'the-real-owner',
      credentialId: 'the-real-cred',
      sessionName: 'demo-session',
    });
  });

  it('honors setWritable from the owner in private mode', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'user-a' }), ['h']);

    const controller = connectClient(wsServer, 'app-9', 'user-a');
    await Promise.resolve();
    await Promise.resolve();

    controller.emit('message', JSON.stringify({ type: 'setWritable', writable: true }));
    await Promise.resolve();

    expect(registry.setWritable).toHaveBeenCalledWith('app-9', true);
  });

  it('drops setWritable from a non-owner in private mode', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ ownerId: 'owner-1', controllerId: 'user-b' }), ['h']);

    const nonController = connectClient(wsServer, 'app-10', 'user-b');
    await Promise.resolve();
    await Promise.resolve();

    nonController.emit('message', JSON.stringify({ type: 'setWritable', writable: true }));
    await Promise.resolve();

    expect(registry.setWritable).not.toHaveBeenCalled();
  });

  it('sends the current tmux screen snapshot to a viewer joining an already-open connection', async () => {
    // getConnection is truthy by default in beforeEach -> this viewer is
    // riding an existing shared connection, so it must be painted with the
    // current screen; the live output stream only carries bytes emitted
    // after it subscribes.
    (registry.captureSnapshot as jest.Mock).mockResolvedValue('SCREEN-CONTENTS');
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState(), ['h']);

    const viewer = connectClient(wsServer, 'app-snap', 'user-a');
    await flushMicrotasks();

    expect(registry.captureSnapshot).toHaveBeenCalledWith('app-snap');
    expect(viewer.sent.map((s) => JSON.parse(s)).some((m) => m.type === 'output' && m.data.includes('SCREEN-CONTENTS'))).toBe(true);
  });

  it('snapshots the FIRST viewer too, with a clear prefix, so a reconnect repaints cleanly', async () => {
    // The first viewer of a reconnect gets no live attach paint it can render
    // correctly (tmux formats it for the exec pty geometry, which mismatches this
    // viewer's xterm), so it must be painted with a geometry-robust capture-pane
    // snapshot — prefixed with a clear so it overrides the mis-rendered attach paint.
    (registry.getConnection as jest.Mock).mockReturnValue(undefined); // nothing open yet -> this viewer triggers the connect
    (registry.captureSnapshot as jest.Mock).mockResolvedValue('RECON-SCREEN');
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState(), ['h']);

    const viewer = connectClient(wsServer, 'app-first', 'user-a');
    await flushMicrotasks();

    const CLEAR = String.fromCharCode(27) + '[2J' + String.fromCharCode(27) + '[H';
    expect(registry.captureSnapshot).toHaveBeenCalledWith('app-first');
    const outputs = viewer.sent.map((s) => JSON.parse(s)).filter((m) => m.type === 'output');
    expect(outputs.some((m) => m.data.includes('RECON-SCREEN'))).toBe(true);
    expect(outputs.some((m) => m.data.startsWith(CLEAR))).toBe(true);
  });

  it('sends the snapshot only to the joining viewer, not to viewers already attached', async () => {
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState(), ['h']);

    const viewerA = connectClient(wsServer, 'app-s2', 'user-a');
    await flushMicrotasks();

    (registry.captureSnapshot as jest.Mock).mockResolvedValue('B-SCREEN');
    const aSentBeforeB = viewerA.sent.length;
    const viewerB = connectClient(wsServer, 'app-s2', 'user-b');
    await flushMicrotasks();

    expect(viewerB.sent.map((s) => JSON.parse(s)).some((m) => m.type === 'output' && m.data.includes('B-SCREEN'))).toBe(true);
    expect(
      viewerA.sent
        .slice(aSentBeforeB)
        .map((s) => JSON.parse(s))
        .some((m) => m.type === 'output' && m.data.includes('B-SCREEN'))
    ).toBe(false);
  });


  it('refuses a connection whose host is not in the allowlist (no connect attempt)', async () => {
    (registry.getConnection as jest.Mock).mockReturnValue(undefined);
    const wsServer = new FakeWSServer();
    attachSSHWebSocketServer(wsServer as any, registry, asyncAppState({ host: 'evil.example' }), ['sandbox.lab']);
    const viewer = connectClient(wsServer, 'app-wl', 'owner-1');
    await flushMicrotasks();
    expect(registry.connect).not.toHaveBeenCalled();
    expect(viewer.sent.map((s) => JSON.parse(s))).toContainEqual({ type: 'status', connected: false, error: 'host_not_allowed' });
  });
});
