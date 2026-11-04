const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const Y = require('yjs');

const file = path.join(__dirname, 'src/lib/plugin-annotations.ts');
const annotationModule = new Module(file);
annotationModule._compile(
  ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText,
  file,
);
const { readPluginAnnotations } = annotationModule.exports;

test('annotations preserve root order, renderer fields and offscreen geometry while observing live edits and deletion', () => {
  const document = new Y.Doc();
  const lines = document.getArray('lines');
  const points = new Y.Array();
  points.push([10, 20, 30, 40]);
  const rectangle = new Y.Map(Object.entries({
    id: 'rectangle', type: 'rectangle', points, userColor: 'blue.500',
    alpha: 0, size: 0, isComplete: true, text: 'label', userId: 'not-exposed',
  }));
  const offscreenPoints = new Y.Array();
  offscreenPoints.push([2000000, 2500000, 99]);
  const offscreen = new Y.Map(Object.entries({ id: 7, type: 'custom', points: offscreenPoints }));
  lines.push([rectangle, offscreen]);

  const snapshot = readPluginAnnotations(document);
  assert.deepEqual(snapshot.map(({ id }) => id), ['rectangle', 7]);
  assert.deepEqual(snapshot[0], {
    id: 'rectangle', type: 'rectangle', points: [[10, 20], [30, 40]],
    color: 'blue.500', alpha: 0, size: 0, isComplete: true, text: 'label',
  });
  assert.equal(snapshot[1].type, 'custom');
  assert.deepEqual(snapshot[1].points, [[2000000, 2500000]]);

  document.transact(() => {
    points.delete(0, 2);
    points.insert(0, [50, 60]);
    rectangle.set('text', 'edited');
  });
  assert.deepEqual(readPluginAnnotations(document)[0].points, [[50, 60], [30, 40]]);
  assert.equal(readPluginAnnotations(document)[0].text, 'edited');
  assert.deepEqual(snapshot[0].points, [[10, 20], [30, 40]]);

  const replacement = new Y.Array();
  replacement.push([70, 80]);
  rectangle.set('points', replacement);
  assert.deepEqual(readPluginAnnotations(document)[0].points, [[70, 80]]);

  lines.delete(0, 1);
  lines.push([new Y.Map(Object.entries({ id: 'legacy' }))]);
  const remaining = readPluginAnnotations(document);
  assert.deepEqual(remaining.map(({ id }) => id), [7, 'legacy']);
  assert.equal(remaining[1].type, 'line');
  assert.deepEqual(remaining[1].points, []);
  document.destroy();
});
