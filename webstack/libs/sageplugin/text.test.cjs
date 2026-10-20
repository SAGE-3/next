const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const Y = require('yjs');

function harness() {
  const file = path.join(__dirname, 'src/lib/text.ts');
  const module = { exports: {} };
  const timers = new Map();
  let nextTimer = 0;
  const javascript = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;

  vm.runInNewContext(
    javascript,
    {
      module,
      exports: module.exports,
      require,
      console,
      Error,
      Uint8Array,
      atob,
      btoa,
      window: {
        setTimeout(callback) {
          const id = ++nextTimer;
          timers.set(id, callback);
          return id;
        },
        clearTimeout(id) {
          timers.delete(id);
        },
      },
    },
    { filename: file },
  );

  return { PluginText: module.exports.PluginText, timers };
}

function snapshot(document) {
  return { appId: 'app', field: 'body', update: Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64') };
}

// Each request loads and discards a document: there are no connected server-side Yjs clients.
function durableText(initial = '') {
  const seed = new Y.Doc();
  seed.clientID = 1;
  seed.getText('body').insert(0, initial);

  let saved = snapshot(seed);
  seed.destroy();

  let writes = 0;

  return {
    get snapshot() {
      return saved;
    },
    get writes() {
      return writes;
    },
    async apply(update) {
      const document = new Y.Doc();
      document.getText('body');
      Y.applyUpdate(document, Buffer.from(saved.update, 'base64'));
      Y.applyUpdate(document, Buffer.from(update, 'base64'));

      saved = snapshot(document);
      document.destroy();
      writes += 1;

      return saved;
    },
  };
}

class Textarea extends EventTarget {
  selectionStart = 0;
  selectionEnd = 0;
  selectionDirection = 'none';
  content = '';

  get value() {
    return this.content;
  }

  set value(value) {
    this.content = value;
    this.selectionStart = value.length;
    this.selectionEnd = value.length;
  }

  getRootNode() {
    return { activeElement: this };
  }

  setSelectionRange(start, end, direction) {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  }
}

test('failed acknowledgements retain all unsaved edits and a retry remains idempotent', async () => {
  const { PluginText, timers } = harness();
  const store = durableText();
  const errors = [];
  let rejectAcknowledgement;
  let calls = 0;

  const text = new PluginText(
    'app',
    'body',
    async (update) => {
      const saved = await store.apply(update);
      calls += 1;

      if (calls === 1) {
        return new Promise((_, reject) => {
          rejectAcknowledgement = reject;
        });
      }

      return saved;
    },
    (error) => errors.push(error),
    () => {},
  );

  text.text.doc.clientID = 2;
  text.text.insert(0, 'first');
  const flushing = text.flush();
  assert.equal(text.flush(), flushing, 'flushes share one in-flight request');

  const rejected = assert.rejects(flushing, /network offline/);
  text.text.insert(text.text.length, ' second');
  await Promise.resolve();
  rejectAcknowledgement(new Error('network offline'));
  await rejected;

  assert.equal(text.value, 'first second');
  assert.equal(errors.length, 1);
  assert.equal(timers.size, 0, 'a failure does not spin automatic retries');

  await text.flush();

  const reloaded = new Y.Doc();
  Y.applyUpdate(reloaded, Buffer.from(store.snapshot.update, 'base64'));
  assert.equal(reloaded.getText('body').toString(), 'first second');
  reloaded.destroy();
  assert.equal(calls, 2);

  text.dispose();
});
