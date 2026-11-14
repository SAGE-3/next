const path = require('node:path');
const { run } = require('../../tools/build.cjs');

run({
  root: __dirname,
  sdkSource: '../../src/index.ts',
  entries: ['controller', 'card', 'flashcards', 'compare', 'import', 'edit'],
  assets: [
    'manifest.json',
    'controller.html',
    'card.html',
    'flashcards.html',
    'compare.html',
    'import.html',
    'edit.html',
    'base.css',
  ],
  output: path.resolve(__dirname, '../../../../dist/plugins/study-notes.zip'),
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
