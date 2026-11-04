const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const loadTypeScript = require('../../test-module.cjs');
const { sourceFromContext, returnToSource } = loadTypeScript(path.join(__dirname, 'source.ts'));

test('reading sources retain PDF identity and refuse replaced or missing documents', async () => {
  const app = { _id: 'pdf', data: { type: 'PDFViewer', state: { assetid: 'asset' } } };
  const selection = { text: 'Quoted passage' };
  const source = sourceFromContext({ app, document: { assetId: 'asset', page: 2, numPages: 4, selection } });

  assert.equal(source.appId, 'pdf');
  assert.equal(source.page, 2);
  assert.equal(source.selection, selection);

  const navigations = [];
  let apps = [app];
  const plugin = {
    async request(method, params) {
      if (method === 'apps.list') {
        return apps;
      }

      assert.equal(method, 'documents.navigate');
      navigations.push(params);
    },
  };

  await returnToSource(plugin, source);

  assert.equal(navigations.length, 1);
  assert.equal(navigations[0].appId, 'pdf');
  assert.equal(navigations[0].page, 2);

  apps = [{ ...app, data: { ...app.data, state: { assetid: 'replacement' } } }];
  await assert.rejects(returnToSource(plugin, source), /document was replaced/);

  apps = [];
  await assert.rejects(returnToSource(plugin, source), /no longer on this board/);

  await assert.rejects(returnToSource(plugin, { ...source, page: -1 }), /no saved reading source/);
  assert.throws(() => sourceFromContext({ app, document: { assetId: 'asset', page: 4, numPages: 4 } }), /loaded PDF/);
  assert.equal(navigations.length, 1);
});
