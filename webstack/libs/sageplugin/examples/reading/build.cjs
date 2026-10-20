const path = require('node:path');
const { run } = require('../../tools/build.cjs');

run({
  root: __dirname,
  sdkSource: '../../src/index.ts',
  entries: ['controller', 'panel', 'bookmark'],
  assets: ['manifest.json', 'controller.html', 'panel.html', 'bookmark.html', 'reading.css'],
  output: path.resolve(__dirname, '../../../../dist/plugins/sage-reading.zip'),
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
