// Run with node PDFSelection.test.cjs; no browser or applications test target required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const selectionModulePath = path.join(__dirname, 'PDFSelection.ts');
const selectionModule = new Module(selectionModulePath);
selectionModule._compile(
  ts.transpileModule(fs.readFileSync(selectionModulePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  selectionModulePath,
);
const { normalizePDFSelection } = selectionModule.exports;

const bounds = { left: 100, top: 200, right: 500, bottom: 800 };
const rects = [
  { left: 200, top: 350, right: 400, bottom: 500 },
  { left: 50, top: 750, right: 200, bottom: 900 },
  { left: 700, top: 900, right: 800, bottom: 950 },
];

assert.deepEqual(normalizePDFSelection('  Real PDF passage  ', rects, bounds), {
  text: 'Real PDF passage',
  rects: [
    { x: 0.25, y: 0.25, width: 0.5, height: 0.25 },
    { x: 0, y: 11 / 12, width: 0.25, height: 1 / 12 },
  ],
});

const zoom = (rect) => Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, value * 2]));
assert.deepEqual(normalizePDFSelection('text', rects.map(zoom), zoom(bounds)), normalizePDFSelection('text', rects, bounds));

assert.equal(normalizePDFSelection(' ', rects, bounds), undefined);
assert.equal(normalizePDFSelection('text', [], bounds), undefined);
assert.equal(normalizePDFSelection('text', rects, { ...bounds, right: bounds.left }), undefined);
