/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// The typescript-native alias (TypeScript 7, used only for the `typecheck`
// targets) also ships a `tsc` bin, and yarn classic lets it win the
// node_modules/.bin/tsc link. Everything tooling-related must keep running
// TypeScript 6, so point the bin back at the `typescript` package.
const fs = require('fs');
const path = require('path');

const binDir = path.join(__dirname, '..', '..', 'node_modules', '.bin');
const link = path.join(binDir, 'tsc');
const target = path.join('..', 'typescript', 'bin', 'tsc');

try {
  const current = fs.readlinkSync(link);
  if (current !== target) {
    fs.unlinkSync(link);
    fs.symlinkSync(target, link);
    console.log(`fix-tsc-bin: relinked .bin/tsc -> ${target}`);
  }
} catch (err) {
  console.warn('fix-tsc-bin: skipped:', err.message);
}
