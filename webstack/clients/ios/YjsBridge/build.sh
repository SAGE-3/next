#!/bin/sh
# Build SAGE3/Resources/yjs-bridge.js from bridge.js, with webstack's webpack and the
# yjs version the web client uses. Rebuild after updating yjs in webstack.
set -e
cd "$(dirname "$0")"
../../../node_modules/.bin/webpack --config webpack.config.js
