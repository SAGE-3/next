import * as Y from 'yjs';
import type { App } from '@sage3/applications/schema';
import { SAGEBase } from '@sage3/sagebase';
import { performPluginTextOperation } from './text';

jest.mock('../apps', () => ({ AppsCollection: {} }));
jest.mock('../assets', () => ({ AssetsCollection: { get: jest.fn() } }));
jest.mock('../boards', () => ({ BoardsCollection: { get: jest.fn() } }));
jest.mock('../rooms', () => ({ RoomsCollection: { get: jest.fn() } }));
jest.mock('../link', () => ({ LinkCollection: {} }));
jest.mock('@sage3/sagebase', () => ({
  ...jest.requireActual('@sage3/sagebase'),
  SAGEBase: { Database: { collection: jest.fn() } },
}));

const app: App<'PluginApp'> = {
  _id: 'app',
  _createdAt: 0,
  _updatedAt: 0,
  _createdBy: 'owner',
  _updatedBy: 'owner',
  data: {
    type: 'PluginApp',
    title: 'Note',
    boardId: 'board',
    roomId: 'room',
    position: { x: 0, y: 0, z: 0 },
    size: { width: 300, height: 200, depth: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    state: { pluginId: 'plugin', viewId: 'note', content: {} },
    raised: false,
    dragging: false,
    pinned: false,
  },
};

function textUpdate(value: string): string {
  const document = new Y.Doc();
  document.clientID = 10;
  document.getText('body').insert(0, value);
  const update = Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64');
  document.destroy();
  return update;
}

function plaintext(update: string): string {
  const document = new Y.Doc();
  Y.applyUpdate(document, Buffer.from(update, 'base64'));
  const value = document.getText('body').toString();
  document.destroy();
  return value;
}

beforeEach(() => jest.resetAllMocks());

it('CAS-merges concurrent quote and typing deltas and reloads from durable state with no live Y.Doc', async () => {
  const seed = new Y.Doc();
  seed.clientID = 1;
  seed.getText('body').insert(0, 'start');
  const encodedSeed = Y.encodeStateAsUpdate(seed);
  const vector = Y.encodeStateVector(seed);
  seed.destroy();
  const initial: App<'PluginApp'> = {
    ...app,
    data: {
      ...app.data,
      state: {
        ...app.data.state,
        texts: { body: Buffer.from(encodedSeed).toString('base64') },
      },
    },
  };
  let saved = structuredClone(initial);

  const compareAndSwapNested = jest.fn(async (segments: readonly string[], expected: unknown, value: string, by: string) => {
    expect(segments).toEqual(['state', 'texts', 'body']);
    if (saved.data.state.texts?.body !== expected) {
      return { success: false, conflict: true, writetime: 0, doc: undefined };
    }
    saved = {
      ...saved,
      _updatedBy: by,
      data: { ...saved.data, state: { ...saved.data.state, texts: { body: value } } },
    };
    return { success: true, writetime: 0, doc: structuredClone(saved) };
  });
  const document = { compareAndSwapNested, read: jest.fn(async () => structuredClone(saved)) };
  jest.mocked(SAGEBase.Database.collection).mockResolvedValue({ docRef: () => document } as never);

  const quote = new Y.Doc();
  quote.clientID = 2;
  Y.applyUpdate(quote, encodedSeed);
  quote.getText('body').insert(0, 'quote ');
  const typing = new Y.Doc();
  typing.clientID = 3;
  Y.applyUpdate(typing, encodedSeed);
  typing.getText('body').insert(5, ' typed');
  const quoteDelta = Buffer.from(Y.encodeStateAsUpdate(quote, vector)).toString('base64');
  const typingDelta = Buffer.from(Y.encodeStateAsUpdate(typing, vector)).toString('base64');
  quote.destroy();
  typing.destroy();

  await Promise.all([
    performPluginTextOperation(initial, { method: 'text.apply', params: { appId: 'app', field: 'body', update: quoteDelta } }, 'quoter'),
    performPluginTextOperation(initial, { method: 'text.apply', params: { appId: 'app', field: 'body', update: typingDelta } }, 'writer'),
  ]);
  expect(saved._updatedBy).toBe('writer');

  const reloaded = await performPluginTextOperation(
    structuredClone(saved),
    { method: 'text.get', params: { appId: 'app', field: 'body' } },
    'reader',
  );
  expect(plaintext(reloaded.update)).toBe('quote start typed');

  // Retrying an update whose acknowledgement was lost must not duplicate the quote.
  await performPluginTextOperation(saved, { method: 'text.apply', params: { appId: 'app', field: 'body', update: quoteDelta } }, 'quoter');
  expect(plaintext(saved.data.state.texts!.body)).toBe('quote start typed');

  const deleting = new Y.Doc();
  deleting.clientID = 4;
  Y.applyUpdate(deleting, Buffer.from(saved.data.state.texts!.body, 'base64'));
  deleting.getText('body').delete(0, 6);
  const deletion = Buffer.from(Y.encodeStateAsUpdate(deleting)).toString('base64');
  deleting.destroy();

  await performPluginTextOperation(saved, { method: 'text.apply', params: { appId: 'app', field: 'body', update: deletion } }, 'writer');
  expect(plaintext(saved.data.state.texts!.body)).toBe('start typed');
});

it('rejects foreign roots, rich text, embedded values, nested types and deleted forbidden payloads', async () => {
  const mutations: readonly ((document: Y.Doc) => void)[] = [
    (document) => document.getText('other').insert(0, 'secret'),
    (document) => document.getText('body').insertEmbed(0, { url: 'payload' }),
    (document) => document.getText('body').insert(0, 'styled', { bold: true }),
    (document) => document.getMap('body').set('key', 'value'),
    (document) => document.getArray('body').push(['not text']),
    (document) => document.getText('body').insertEmbed(0, new Y.Text('nested')),
    (document) => {
      document.getText('body').insertEmbed(0, { hidden: true });
      document.getText('body').delete(0, 1);
    },
    (document) => {
      document.getText('other').insert(0, 'hidden');
      document.getText('other').delete(0, 6);
    },
  ];
  for (const mutate of mutations) {
    // Preserve deleted struct payloads to exercise validation beyond visible toDelta content.
    const document = new Y.Doc({ gc: false });
    document.clientID = 10;
    mutate(document);
    const update = Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64');
    document.destroy();
    await expect(
      performPluginTextOperation(app, { method: 'text.apply', params: { appId: 'app', field: 'body', update } }, 'owner'),
    ).rejects.toMatchObject({ status: 400 });
  }
  expect(SAGEBase.Database.collection).not.toHaveBeenCalled();
});

it('stops a conflicted operation if the app disappears or leaves its authorized plugin and board', async () => {
  const document = {
    compareAndSwapNested: jest.fn().mockResolvedValue({ success: false, conflict: true, writetime: 0 }),
    read: jest.fn(),
  };
  jest.mocked(SAGEBase.Database.collection).mockResolvedValue({ docRef: () => document } as never);
  const unavailable = [
    undefined,
    { ...app, data: { ...app.data, boardId: 'other' } },
    { ...app, data: { ...app.data, roomId: 'other' } },
    { ...app, data: { ...app.data, state: { ...app.data.state, pluginId: 'other' } } },
  ];
  for (const latest of unavailable) {
    document.read.mockResolvedValue(latest);
    await expect(
      performPluginTextOperation(
        app,
        {
          method: 'text.apply',
          params: { appId: 'app', field: 'body', update: textUpdate('local') },
        },
        'owner',
      ),
    ).rejects.toMatchObject({ status: 404 });
  }
});
