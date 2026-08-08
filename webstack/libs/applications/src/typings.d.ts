/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Ambient declarations so ts-jest type-checks side-effect asset imports (e.g.
// '@xterm/xterm/css/xterm.css') under moduleResolution: bundler
// (noUncheckedSideEffectImports). At runtime jest maps these via moduleNameMapper.
declare module '*.css';
declare module '*.scss';
