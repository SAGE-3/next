const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const loadTypeScript = require('../../test-module.cjs');
const { parseBoard, remapReferences } = loadTypeScript(path.join(__dirname, 'portable.ts'));

test('portable boards preserve diagnostics and remap identities instead of display names', () => {
  const board = {
    format: 'sage3-study-notes',
    version: 2,
    manifestId: 'study-notes',
    boardId: 'board-old',
    installationId: 'plugin-old',
    state: {},
    assets: [],
    links: [],
    apps: [
      {
        id: 'cell-old',
        type: 'SageCell',
        title: 'Unsupported code',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 400 },
      },
    ],
  };

  assert.equal(parseBoard(board).apps[0].type, 'SageCell');
  assert.throws(() => parseBoard({ ...board, version: 1 }), /version 2/);
  assert.throws(() => parseBoard({ ...board, apps: [...board.apps, ...board.apps] }), /duplicate/);
  assert.throws(
    () =>
      parseBoard({ ...board, assets: [{ id: 'asset', name: 'paper.pdf', mimeType: 'application/pdf', path: '../secret', previews: [] }] }),
    /asset/,
  );

  const ids = new Map([
    ['app-old', 'app-new'],
    ['asset-old', 'asset-new'],
    ['plugin-old', 'plugin-new'],
    ['link-old', 'link-new'],
  ]);

  const result = remapReferences(
    {
      pluginId: 'plugin-old',
      assetId: 'asset-old',
      linkId: 'link-old',
      title: 'same-file.pdf',
      source: { appId: 'app-old', page: 2 },
      body: '[p3](sage3://document/app-old?page=2&assetId=asset-old)',
    },
    ids,
  );

  assert.equal(result.pluginId, 'plugin-new');
  assert.equal(result.assetId, 'asset-new');
  assert.equal(result.linkId, 'link-new');
  assert.equal(result.title, 'same-file.pdf');
  assert.equal(result.source.appId, 'app-new');
  assert.match(result.body, /app-new/);
  assert.match(result.body, /assetId=asset-new/);
  assert.match(result.body, /page=2/);
});
