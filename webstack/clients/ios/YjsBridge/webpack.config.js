// Bundle bridge.js with the web client's yjs, y-protocols, and lib0 (from webstack's
// node_modules) into one script for JavaScriptCore. Run ./build.sh.
const path = require('path');

module.exports = {
  mode: 'production',
  target: ['web', 'es2020'],
  entry: path.resolve(__dirname, 'bridge.js'),
  output: {
    path: path.resolve(__dirname, '../SAGE3/Resources'),
    filename: 'yjs-bridge.js',
  },
  resolve: {
    modules: [path.resolve(__dirname, '../../../node_modules')],
  },
  performance: { hints: false },
};
