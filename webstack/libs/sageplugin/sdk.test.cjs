const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const { once } = require('node:events');
const { MessageChannel } = require('node:worker_threads');
const { test } = require('node:test');
const ts = require('typescript');
const Y = require('yjs');

const protocol = 'sage3:plugin';
const context = {
  boardId: 'board',
  roomId: 'room',
  selectedAppIds: [],
  appOrder: [],
  viewport: { position: { x: 0, y: 0 }, size: { width: 1000, height: 800 }, scale: 1 },
  theme: {
    mode: 'light',
    background: '#fff',
    foreground: '#111',
    muted: '#666',
    border: '#ccc',
    accent: '#147',
    fontFamily: 'sans-serif',
  },
};

const init = {
  pluginId: 'plugin',
  boardId: 'board',
  roomId: 'room',
  context,
  state: { revision: 0, value: {} },
};

function harness() {
  const window = new EventTarget();
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;

  const readyMessages = [];
  window.parent = {
    postMessage: (message, origin) => readyMessages.push({ message, origin }),
  };

  const modules = new Map();

  const load = (file) => {
    if (modules.has(file)) {
      return modules.get(file);
    }

    const module = { exports: {} };
    const nativeRequire = createRequire(file);
    const javascript = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;

    vm.runInNewContext(
      javascript,
      {
        module,
        exports: module.exports,
        window,
        console,
        Uint8Array,
        atob,
        btoa,
        queueMicrotask,
        require: (specifier) => {
          if (specifier.startsWith('.')) {
            return load(path.resolve(path.dirname(file), `${specifier}.ts`));
          }

          return nativeRequire(specifier);
        },
      },
      { filename: file },
    );

    modules.set(file, module.exports);
    return module.exports;
  };

  const module = { exports: load(path.join(__dirname, 'src/lib/sageplugin.ts')) };

  const plugin = new module.exports.SAGE3Plugin();
  const dispatch = (data, source = window.parent, ports = []) => {
    window.dispatchEvent(Object.assign(new Event('message'), { data, source, ports }));
  };

  return { plugin, window, readyMessages, dispatch };
}

test('SDK confines traffic to its parent-issued port and settles every action', async () => {
  const { plugin, window, readyMessages, dispatch } = harness();
  const { port1: host, port2: client } = new MessageChannel();

  try {
    assert.equal(readyMessages.length, 1);
    assert.equal(readyMessages[0].message.kind, 'ready');

    dispatch({ protocol, kind: 'init', data: init }, {}, [client]);
    assert.equal(plugin.context, undefined, 'foreign frame cannot initialize SDK');

    dispatch({ protocol, kind: 'init', data: init }, window.parent, [client]);
    assert.equal((await plugin.ready).pluginId, 'plugin');

    let notifications = 0;
    const unsubscribe = plugin.on('state', () => {
      notifications += 1;
    });

    host.postMessage({ protocol, kind: 'event', event: 'state', data: { revision: 1, value: { saved: true } } });

    const outgoing = once(host, 'message');
    const request = plugin.request('state.get');
    const [message] = await outgoing;

    dispatch({ protocol, kind: 'response', id: message.id, result: { forged: true } });
    host.postMessage({ protocol, kind: 'response', id: 'unrelated', result: { forged: true } });
    host.postMessage({ protocol, kind: 'response', id: message.id, result: { revision: 1, value: { valid: true } } });

    assert.equal((await request).value.valid, true);
    assert.equal(plugin.state.value.saved, true);
    assert.equal(notifications, 1);

    unsubscribe();
    host.postMessage({ protocol, kind: 'event', event: 'state', data: { revision: 2, value: { saved: false } } });

    const barrierMessage = once(host, 'message');
    const barrier = plugin.request('state.get');
    const [barrierRequest] = await barrierMessage;
    host.postMessage({ protocol, kind: 'response', id: barrierRequest.id, result: { revision: 2, value: { saved: false } } });
    await barrier;
    assert.equal(notifications, 1, 'unsubscribe detaches the listener');

    const unregister = plugin.onCommand('note', async (snapshot) => {
      assert.equal(snapshot.boardId, 'board');
    });

    const acknowledged = once(host, 'message');
    host.postMessage({
      protocol,
      kind: 'request',
      id: 'command-1',
      method: 'command.run',
      params: { id: 'note', context },
    });
    assert.equal((await acknowledged)[0].error, undefined);

    unregister();

    const missing = once(host, 'message');
    host.postMessage({
      protocol,
      kind: 'request',
      id: 'command-2',
      method: 'command.run',
      params: { id: 'note', context },
    });
    assert.match((await missing)[0].error, /No handler/);

    plugin.onCommand('fail', async () => {
      throw new Error('Denied operation');
    });

    const failure = once(host, 'message');
    host.postMessage({
      protocol,
      kind: 'request',
      id: 'command-3',
      method: 'command.run',
      params: { id: 'fail', context },
    });
    assert.match((await failure)[0].error, /Denied operation/);

    const deniedMessage = once(host, 'message');
    const denied = plugin.request('state.patch', { changes: [{ op: 'set', path: ['x'], value: 1 }] });
    const rejectedDenied = assert.rejects(denied, /Permission denied/);
    const [deniedRequest] = await deniedMessage;

    host.postMessage({ protocol, kind: 'response', id: deniedRequest.id, error: 'Permission denied' });
    await rejectedDenied;

    const pendingMessage = once(host, 'message');
    const pending = plugin.request('state.get');
    const rejectedPending = assert.rejects(pending, /disposed/);
    await pendingMessage;

    plugin.dispose();
    await rejectedPending;
    await assert.rejects(plugin.request('state.get'), /disposed/);
  } finally {
    plugin.dispose();
    host.close();
    client.close();
  }

  const beforeReady = harness();
  beforeReady.plugin.dispose();
  await assert.rejects(beforeReady.plugin.ready, /disposed/);
});

test('readText decodes edited Unicode plaintext without exposing an editable document', async () => {
  const { plugin, window, dispatch } = harness();
  const { port1: host, port2: client } = new MessageChannel();
  const document = new Y.Doc();
  try {
    const body = document.getText('body');
    body.insert(0, 'old 🌍');
    body.delete(0, 3);
    body.insert(0, 'new');
    dispatch({ protocol, kind: 'init', data: init }, window.parent, [client]);
    const outgoing = once(host, 'message');
    const value = plugin.readText('body', 'another-app');
    const [request] = await outgoing;
    host.postMessage({
      protocol,
      kind: 'response',
      id: request.id,
      result: { appId: 'another-app', field: 'body', update: Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64') },
    });
    assert.equal(await value, 'new 🌍');
    await assert.rejects(plugin.readText('body'), /bound app/);
  } finally {
    plugin.dispose();
    document.destroy();
    host.close();
    client.close();
  }
});
